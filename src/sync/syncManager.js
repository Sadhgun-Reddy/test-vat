// src/sync/syncManager.js
// ============================================================
// VAHD AHIS 2026 — Client-side Sync Manager
// Orchestrates push (device→server) and pull (server→device)
// Runs on reconnect, on explicit trigger, and every 5 minutes.
// ============================================================

import axios from 'axios';
import {
  getPendingQueue,
  markQueueItemSynced,
  markQueueItemFailed,
  applyServerChanges,
  getCursor,
  setCursor,
  getPendingCount,
  saveConflict,
  getDeviceId,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearAuth,
} from './offlineStore';

/** Ensures requests hit `/api/v1/...` when env is only host:port (common misconfig → 404). */
function normalizeApiBase(raw) {
  const fallback = 'http://localhost:4000/api/v1';
  let u = String(raw || fallback).trim();
  u = u.replace(/\/+$/, '');
  if (!/\/api\/v1$/i.test(u)) u = `${u}/api/v1`;
  return u;
}

const BASE_URL = normalizeApiBase(import.meta.env.VITE_API_URL);
if (import.meta.env.MODE === 'production' && /localhost|127\.0\.0\.1/i.test(BASE_URL)) {
  console.error(
    '[VAHD] API calls use localhost — set VITE_API_URL in Vercel → Project → Settings → Environment Variables, then redeploy the frontend.'
  );
}
const SYNC_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes
const BATCH_SIZE        = 50;

let syncTimer   = null;
let _callbacks  = { onSyncStart: null, onSyncEnd: null, onConflict: null, onOnlineChange: null };

// ── Axios instance with JWT + auto-refresh ────────────────────
const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser set multipart boundary for uploads (wrong Content-Type breaks /districts/import)
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refresh = await getRefreshToken();
        const deviceId = await getDeviceId();
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh, device_id: deviceId });
        await saveTokens(data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        await clearAuth();
        window.dispatchEvent(new CustomEvent('vahd:logout'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ── Public API ────────────────────────────────────────────────
export const syncManager = {
  api,   // expose for non-sync API calls too

  /** Register lifecycle callbacks */
  on(event, fn) { _callbacks[event] = fn; return this; },

  /** Explicitly trigger a full sync */
  async sync() {
    if (!navigator.onLine) {
      console.info('[Sync] Offline — queued operations will sync on reconnect');
      return { skipped: true };
    }
    _callbacks.onSyncStart?.();
    try {
      const push = await pushPending();
      const pull = await pullChanges();
      const result = { push, pull };
      _callbacks.onSyncEnd?.(result);
      return result;
    } catch (err) {
      console.error('[Sync] Error during sync:', err);
      _callbacks.onSyncEnd?.({ error: err.message });
      throw err;
    }
  },

  /** Start the background auto-sync timer */
  startAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      if (navigator.onLine) this.sync().catch(console.error);
    }, SYNC_INTERVAL_MS);

    // Sync immediately on reconnect
    window.addEventListener('online', _onOnline);
    window.addEventListener('offline', _onOffline);
  },

  stopAutoSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    window.removeEventListener('online', _onOnline);
    window.removeEventListener('offline', _onOffline);
  },

  /** Get pending count from local store */
  getPendingCount,
};

// ── Push: send pending queue items to server ─────────────────
async function pushPending() {
  const queue = await getPendingQueue(BATCH_SIZE);
  if (!queue.length) return { sent: 0, conflicts: 0, failed: 0 };

  const deviceId = await getDeviceId();
  const operations = queue.map(item => ({
    table_name:  item.table_name,
    operation:   item.operation,
    record_id:   item.record_id,
    payload:     item.payload,
    vector_clock: item.vector_clock || {},
  }));

  try {
    const { data } = await api.post('/sync/push', { device_id: deviceId, operations });
    // Handle conflicts returned from server
    if (data.conflicts > 0) {
      await _fetchAndSaveConflicts(deviceId);
    }
    // Mark all successfully sent items
    for (const item of queue) {
      await markQueueItemSynced(item.local_id);
    }
    return { sent: data.processed, conflicts: data.conflicts, failed: data.failed };
  } catch (err) {
    if (!err.response) {
      // Network error — leave queue intact
      return { sent: 0, conflicts: 0, failed: 0, network_error: true };
    }
    // Server error — mark all as failed
    for (const item of queue) {
      await markQueueItemFailed(item.local_id, err.message);
    }
    return { sent: 0, conflicts: 0, failed: queue.length };
  }
}

// ── Pull: get server changes into IndexedDB ───────────────────
async function pullChanges() {
  const deviceId = await getDeviceId();
  const PULL_TABLES = [
    'case_treated','vaccinations','deworming','ai_services',
    'attendance','farmers','employees','drugs','drug_indents',
    'leave_applications','fodder_records',
  ];
  try {
    const { data } = await api.get('/sync/pull', {
      params: { device_id: deviceId, tables: PULL_TABLES.join(',') },
    });
    await applyServerChanges(data.changes);
    const counts = Object.fromEntries(
      Object.entries(data.changes).map(([t, r]) => [t, r.length])
    );
    return { pulled_at: data.pulled_at, counts };
  } catch (err) {
    console.error('[Sync] Pull error:', err.message);
    return { error: err.message };
  }
}

// ── Fetch conflicts from server ───────────────────────────────
async function _fetchAndSaveConflicts(deviceId) {
  try {
    const { data } = await api.get('/sync/conflicts', { params: { device_id: deviceId } });
    for (const c of data.conflicts) {
      await saveConflict(c);
      _callbacks.onConflict?.(c);
    }
  } catch { /* non-fatal */ }
}

// ── Network listeners ─────────────────────────────────────────
const _onOnline = () => {
  _callbacks.onOnlineChange?.(true);
  syncManager.sync().catch(console.error);
};
const _onOffline = () => {
  _callbacks.onOnlineChange?.(false);
};