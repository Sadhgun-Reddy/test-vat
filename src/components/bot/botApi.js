// src/components/bot/botApi.js
// Dedicated admin-level axios instance for the InternalBot.
// Maintains its own session (access + refresh tokens) completely
// separate from the logged-in user's session — so a VO/ADO user
// can still query admin-only endpoints through the bot.
//
// Flow:
//   1. First query → POST /auth/login with bot credentials → store tokens in memory
//   2. Subsequent queries → use stored access token
//   3. On 401 TOKEN_EXPIRED → POST /auth/refresh → retry once
//   4. On refresh failure → force re-login on next query
import axios from 'axios';

const BASE_URL = (() => {
  const raw = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/v1';
  const u = raw.trim().replace(/\/+$/, '');
  return /\/api\/v1$/i.test(u) ? u : `${u}/api/v1`;
})();

const BOT_EMAIL    = process.env.REACT_APP_BOT_EMAIL    || 'admin@vahd.gov.in';
const BOT_PASSWORD = process.env.REACT_APP_BOT_PASSWORD || 'Admin@123';

// ── In-memory token store (never touches IndexedDB / user session) ─
let _accessToken  = null;
let _refreshToken = null;
let _loginPromise = null;   // deduplicate concurrent login calls

async function doLogin() {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, {
    email: BOT_EMAIL,
    password: BOT_PASSWORD,
  });
  _accessToken  = data.access_token  || data.accessToken  || data.token;
  _refreshToken = data.refresh_token || data.refreshToken || null;
  return _accessToken;
}

async function ensureToken() {
  if (_accessToken) return _accessToken;
  if (_loginPromise) return _loginPromise;
  _loginPromise = doLogin().finally(() => { _loginPromise = null; });
  return _loginPromise;
}

async function doRefresh() {
  if (!_refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
    refresh_token: _refreshToken,
  });
  _accessToken  = data.access_token  || data.accessToken  || data.token;
  _refreshToken = data.refresh_token || data.refreshToken || _refreshToken;
  return _accessToken;
}

// ── Axios instance ─────────────────────────────────────────────
const botAxios = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

botAxios.interceptors.request.use(async (config) => {
  const token = await ensureToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

botAxios.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;
    const code     = error.response?.data?.code;

    // Token expired → try refresh once, then re-login once
    if (status === 401 && !original._botRetry) {
      original._botRetry = true;
      try {
        const token = code === 'TOKEN_EXPIRED' && _refreshToken
          ? await doRefresh()
          : await doLogin();
        original.headers.Authorization = `Bearer ${token}`;
        return botAxios(original);
      } catch {
        _accessToken = null;
        _refreshToken = null;
      }
    }
    return Promise.reject(error);
  }
);

// ── Public helper: safe fetch → { ok, data, status, message } ──
export async function botFetch(url) {
  try {
    const { data } = await botAxios.get(url);
    return { ok: true, data };
  } catch (e) {
    const status  = e.response?.status;
    const message = e.response?.data?.error || e.message || 'Request failed';
    if (status === 403) return { ok: false, status, message: `Access denied (${message})` };
    if (status === 401) return { ok: false, status, message: 'Bot authentication failed — check BOT_EMAIL / BOT_PASSWORD in .env' };
    return { ok: false, status, message };
  }
}

export default botAxios;
