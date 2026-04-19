// src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getDeviceId } from '../../sync/offlineStore';
import { DEMO_USERS } from '../../constants/demoUsers';
import toast from 'react-hot-toast';

function loginErrorMessage(err) {
  const d = err?.response?.data;
  const fromApi = (typeof d?.error === 'string' && d.error) || (typeof d?.detail === 'string' && d.detail);
  if (fromApi) return fromApi;
  if (!err?.response && err?.message) {
    return `Cannot reach API (${import.meta.env.VITE_API_URL || 'http://193.203.162.8/api/v1'}). Start the backend and confirm the URL.`;
  }
  return 'Invalid email or password.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setError(''); setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const result = await login(email, password, deviceId);
      toast.success(result?.demo ? 'Signed in with demo account (no real API session).' : 'Welcome back!');
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg1)', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,.12)', width: '100%', maxWidth: 420, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,var(--blu2),var(--blu))',
          padding: '32px 28px 24px', textAlign: 'center',
        }}>
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 12px' }}>🐄</div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>VAHD · AHIS 2026</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 5 }}>Veterinary &amp; Animal Husbandry Department · Telangana</p>
        </div>

        {/* Form */}
        <div style={{ padding: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@vahd.gov.in"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, color: 'var(--txt)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, color: 'var(--txt)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', color: '#991b1b', borderRadius: 6, padding: '10px 12px', fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} style={{
            width: '100%', padding: '11px', background: 'var(--blu)', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1,
            fontFamily: 'var(--fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {import.meta.env.VITE_DEMO_LOGIN === 'true' && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, marginBottom: 10 }}>Demo only (no JWT)</div>
            {DEMO_USERS.map(u => (
              <div key={u.email} onClick={() => { setEmail(u.email); setPassword(u.password); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--bg1)', border: '1px solid var(--bdr)', borderRadius: 6,
                  cursor: 'pointer', marginBottom: 6, transition: 'all .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--blu-lt)'; e.currentTarget.style.borderColor='var(--blu-bdr)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--bg1)'; e.currentTarget.style.borderColor='var(--bdr)'; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blu),var(--blu2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.initials}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{u.roleLabel || u.role} · {u.email}</div>
                </div>
              </div>
            ))}
          </div>
          )}
          {import.meta.env.VITE_DEMO_LOGIN !== 'true' && (
            <p style={{ marginTop: 20, fontSize: 11, color: 'var(--txt3)', lineHeight: 1.5 }}>
              Sign in with a real account from the database. After migrations, try{' '}
              <strong style={{ color: 'var(--txt2)' }}>admin@vahd.gov.in</strong> / <strong style={{ color: 'var(--txt2)' }}>Admin@123</strong>{' '}
              (director). Run <code style={{ fontSize: 10 }}>npm run seed</code> in <code style={{ fontSize: 10 }}>backend</code> for director, DVAHO, VO, and admin users — same password until you change it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}