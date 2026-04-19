// src/sync/offlineStore.js
// ============================================================
// VAHD AHIS 2026 — Client-side Offline Store (IndexedDB via idb)
// ============================================================
// This module is the client half of the sync engine.
// All mutations are written here first, then pushed to the server
// when the device is online. The server never blocks data entry.
// ============================================================

import { openDB } from 'idb';

const DB_NAME    = 'vahd_ahis_v2';
const DB_VERSION = 3;

// Tables that live in IndexedDB
const SYNC_TABLES = [
  'case_treated', 'vaccinations', 'deworming', 'ai_services',
  'attendance', 'leave_applications', 'fodder_records',
  'mpr_operations', 'drug_sales', 'drug_indents',
  'farmers', 'employees', 'veterinary_inspections',
  'iot_readings',
];

let _db = null;

export async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── Data stores (one per synced table) ──────────────────
      for (const table of SYNC_TABLES) {
        if (!db.objectStoreNames.contains(table)) {
          const store = db.createObjectStore(table, { keyPath: 'id' });
          store.createIndex('district_id', 'district_id');
          store.createIndex('sync_status', 'sync_status');
          store.createIndex('updated_at',  'updated_at');
        }
      }

      // ── Sync queue: ops waiting to push to server ────────────
      if (!db.objectStoreNames.contains('_sync_queue')) {
        const q = db.createObjectStore('_sync_queue', { keyPath: 'local_id', autoIncrement: true });
        q.createIndex('table_name', 'table_name');
        q.createIndex('status',     'status');
        q.createIndex('created_at', 'created_at');
      }

      // ── Sync cursors: last-sync timestamps per table ─────────
      if (!db.objectStoreNames.contains('_sync_cursors')) {
        db.createObjectStore('_sync_cursors', { keyPath: 'table_name' });
      }

      // ── Key-value meta store (JWT, device_id, settings) ─────
      if (!db.objectStoreNames.contains('_meta')) {
        db.createObjectStore('_meta', { keyPath: 'key' });
      }

      // ── Conflict store for UI review ─────────────────────────
      if (!db.objectStoreNames.contains('_conflicts')) {
        const c = db.createObjectStore('_conflicts', { keyPath: 'id' });
        c.createIndex('resolved', 'resolved');
      }
    },
  });
  return _db;
}

// ── Device ID (persistent per device/browser) ─────────────────
export async function getDeviceId() {
  const db = await getDB();
  const meta = await db.get('_meta', 'device_id');
  if (meta) return meta.value;
  const id = 'DVC-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9).toUpperCase();
  await db.put('_meta', { key: 'device_id', value: id });
  return id;
}

// ── Generic CRUD on local store ───────────────────────────────
export async function getAll(table, { districtId, syncStatus, limit = 100 } = {}) {
  const db = await getDB();
  let records = await db.getAll(table);
  if (districtId)  records = records.filter(r => r.district_id === districtId);
  if (syncStatus)  records = records.filter(r => r.sync_status === syncStatus);
  return records.slice(0, limit);
}

export async function getById(table, id) {
  const db = await getDB();
  return db.get(table, id);
}

// ── Write a record and enqueue a sync operation ───────────────
/**
 * Saves a record locally and enqueues it for server sync.
 * operation: 'INSERT' | 'UPDATE' | 'DELETE'
 */
export async function upsertAndEnqueue(table, record, operation = 'INSERT') {
  const db = await getDB();
  const tx = db.transaction([table, '_sync_queue'], 'readwrite');

  // Generate client-side ID if missing
  if (!record.id) {
    record.id = crypto.randomUUID();
  }
  record.sync_status = 'pending';
  record.updated_at  = new Date().toISOString();

  // Increment local vector clock
  const deviceId = await getDeviceId();
  const existing = await tx.objectStore(table).get(record.id);
  const prevClock = existing?.vector_clock || {};
  record.vector_clock = {
    ...prevClock,
    [deviceId]: ((prevClock[deviceId] || 0) + 1),
  };
  record.version = (existing?.version || 0) + 1;

  // Write to local store
  if (operation === 'DELETE') {
    await tx.objectStore(table).delete(record.id);
  } else {
    await tx.objectStore(table).put(record);
  }

  // Enqueue for sync
  await tx.objectStore('_sync_queue').add({
    table_name:   table,
    operation,
    record_id:    record.id,
    payload:      record,
    vector_clock: record.vector_clock,
    status:       'pending',
    retry_count:  0,
    created_at:   new Date().toISOString(),
  });

  await tx.done;
  return record;
}

// ── Pull: update local store from server changes ──────────────
export async function applyServerChanges(tableChanges) {
  const db = await getDB();
  for (const [table, records] of Object.entries(tableChanges)) {
    if (!SYNC_TABLES.includes(table) || !records?.length) continue;
    const tx = db.transaction(table, 'readwrite');
    for (const rec of records) {
      rec.sync_status = 'synced';
      await tx.store.put(rec);
    }
    await tx.done;
  }
}

// ── Queue management ──────────────────────────────────────────
export async function getPendingQueue(limit = 100) {
  const db = await getDB();
  const all = await db.getAllFromIndex('_sync_queue', 'status', 'pending');
  return all.slice(0, limit).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function markQueueItemSynced(localId) {
  const db = await getDB();
  await db.delete('_sync_queue', localId);
}

export async function markQueueItemFailed(localId, error) {
  const db = await getDB();
  const item = await db.get('_sync_queue', localId);
  if (item) {
    item.status      = 'failed';
    item.error       = error;
    item.retry_count = (item.retry_count || 0) + 1;
    await db.put('_sync_queue', item);
  }
}

export async function getPendingCount() {
  const db = await getDB();
  return db.countFromIndex('_sync_queue', 'status', 'pending');
}

// ── Cursor management ─────────────────────────────────────────
export async function getCursor(table) {
  const db = await getDB();
  const rec = await db.get('_sync_cursors', table);
  return rec?.last_synced_at || null;
}

export async function setCursor(table, ts) {
  const db = await getDB();
  await db.put('_sync_cursors', { table_name: table, last_synced_at: ts });
}

// ── Conflict management ───────────────────────────────────────
export async function saveConflict(conflict) {
  const db = await getDB();
  await db.put('_conflicts', { ...conflict, resolved: false });
}

export async function getUnresolvedConflicts() {
  const db = await getDB();
  // IndexedDB keys must be string/number/Date/ArrayBuffer/array — not boolean.
  // Querying index `resolved` with `false` throws DataError; filter in memory instead.
  const all = await db.getAll('_conflicts');
  return all.filter(c => c && c.resolved === false);
}

export async function resolveLocalConflict(conflictId) {
  const db = await getDB();
  const c = await db.get('_conflicts', conflictId);
  if (c) { c.resolved = true; await db.put('_conflicts', c); }
}

// ── Auth token helpers ────────────────────────────────────────
/** Marker token for local demo sessions (no backend). */
export const DEMO_ACCESS_TOKEN = 'vahd-demo-local-session';

export async function saveTokens(accessToken, refreshToken) {
  const db = await getDB();
  await Promise.all([
    db.put('_meta', { key: 'access_token',  value: accessToken }),
    db.put('_meta', { key: 'refresh_token', value: refreshToken }),
    db.delete('_meta', 'demo_user'),
  ]);
}

/** Persist a demo session when API login is unavailable but credentials match demo accounts. */
export async function saveDemoSession(user) {
  const db = await getDB();
  await Promise.all([
    db.put('_meta', { key: 'access_token', value: DEMO_ACCESS_TOKEN }),
    db.put('_meta', { key: 'refresh_token', value: DEMO_ACCESS_TOKEN }),
    db.put('_meta', { key: 'demo_user', value: user }),
  ]);
}

export async function getDemoUser() {
  const db = await getDB();
  const m = await db.get('_meta', 'demo_user');
  return m?.value || null;
}

export async function getAccessToken() {
  const db = await getDB();
  const m = await db.get('_meta', 'access_token');
  return m?.value || null;
}

export async function getRefreshToken() {
  const db = await getDB();
  const m = await db.get('_meta', 'refresh_token');
  return m?.value || null;
}

export async function clearAuth() {
  const db = await getDB();
  await Promise.all([
    db.delete('_meta', 'access_token'),
    db.delete('_meta', 'refresh_token'),
    db.delete('_meta', 'demo_user'),
  ]);
}