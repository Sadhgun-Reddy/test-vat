// src/components/layout/TopNav.jsx
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useSync } from '../../store/SyncContext';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',         icon: '⌘' },
  {
    label: 'Clinical', icon: '🩺', group: true,
    children: [
      { to: '/cases',        label: 'Cases Treated',     icon: '🩺' },
      { to: '/vaccinations', label: 'Vaccinations',      icon: '💉' },
      { to: '/deworming',    label: 'Deworming',         icon: '🔬' },
      { to: '/ai-service',   label: 'Art. Insemination', icon: '🐄' },
      { to: '/fodder',         label: 'Fodder',            icon: '🌾' },
      { to: '/daily-progress', label: 'Daily Progress',    icon: '📈' },
    ],
  },
  {
    label: 'HRMS', icon: '👥', group: true,
    children: [
      { to: '/hrms',              label: 'HRMS Overview',  icon: '👥' },
      { to: '/employees',         label: 'Employees',       icon: '👤' },
      { to: '/attendance',        label: 'Attendance',      icon: '📋' },
      { to: '/attendance-report', label: 'Att. Report',     icon: '📊' },
      { to: '/leaves',            label: 'Leave Form',      icon: '📄' },
      { to: '/farmers',           label: 'Farmers',         icon: '🌾' },
    ],
  },
  {
    label: 'Drugs', icon: '💊', group: true,
    children: [
      { to: '/drugs',       label: 'Product',     icon: '💊' },
      { to: '/stock',       label: 'Purchases',   icon: '🗄' },
      { to: '/indents',     label: 'Drug Indent', icon: '📋' },
      { to: '/allocations', label: 'Allocations', icon: '📦' },
      { to: '/drug-sale',   label: 'Drug Sale',   icon: '🧾' },
    ],
  },
  {
    label: 'Citizens', icon: '👨‍🌾', group: true,
    children: [
      { to: '/citizen/registration',     label: 'Registration',            icon: '📝' },
      { to: '/citizen/fodder-seed',      label: 'Fodder Seed',             icon: '🌾' },
      { to: '/citizen/sex-sorted-semen', label: 'Sex Sorted Semen',        icon: '🐄' },
      { to: '/citizen/deworming',        label: 'Deworming',               icon: '🔬' },
      { to: '/citizen/ai',               label: 'Artificial Insemination', icon: '💉' },
      { to: '/citizen/grievances',       label: 'Grievances',              icon: '📣' },
    ],
  },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/iot',     label: 'IoT',     icon: '📡' },
  { to: '/sync',    label: 'Data Sync', icon: '⇄' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

const DROPDOWN_ICON_BG = ['#ede9fe', '#dbeafe', '#ffedd5', '#e0f2fe', '#d1fae5', '#fce7f3'];

function NavGroup({ item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const btnRef = useRef();
  const pos = useDropdownPosition(open, btnRef);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        className="nav-group-btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 9px', borderRadius: 8, border: 'none',
          background: open ? 'var(--blu-lt)' : 'transparent',
          color: open ? 'var(--blu)' : 'var(--txt)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--fb)', transition: 'background .15s, color .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--blu-lt)';
          e.currentTarget.style.color = 'var(--blu)';
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--txt)';
          }
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
        {item.label}
        <span className={`nav-dropdown-caret${open ? ' nav-dropdown-caret--open' : ''}`} aria-hidden>
          <svg className="nav-dropdown-chevron" width="9" height="5" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path d="M1 1.25L5 4.75L9 1.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && pos && (
        <div
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            minWidth: Math.max(228, pos.minWidth),
            background: '#fff',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            borderRadius: 14,
            boxShadow: '0 10px 36px rgba(15, 23, 42, 0.1), 0 3px 12px rgba(15, 23, 42, 0.05)',
            zIndex: 10000,
            padding: 6,
            animation: 'dropIn .14s ease',
          }}
        >
          {item.children.map((c, idx) => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 10px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 12,
                color: isActive ? 'var(--blu)' : 'var(--txt)',
                fontWeight: isActive ? 700 : 600,
                background: isActive ? 'var(--blu-lt)' : 'transparent',
                transition: 'background .12s ease',
              })}
              onMouseEnter={e => {
                if (e.currentTarget.getAttribute('aria-current') === 'page') return;
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background =
                  e.currentTarget.getAttribute('aria-current') === 'page' ? 'var(--blu-lt)' : 'transparent';
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  background: DROPDOWN_ICON_BG[idx % DROPDOWN_ICON_BG.length],
                }}
              >
                {c.icon}
              </span>
              <span>{c.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const { pendingCount, isSyncing, triggerSync } = useSync();
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);
  const userRef = useRef();
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  useEffect(() => {
    const h = e => { if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: 'rgba(255, 255, 255, 0.76)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 4px 28px rgba(26, 86, 219, 0.07)',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        columnGap: 'clamp(10px, 1.5vw, 20px)',
        padding: '0 clamp(12px,2vw,32px)',
        minHeight: 'var(--nav-h)',
        maxWidth: 2400,
        margin: '0 auto',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 27, height: 27, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg,var(--blu),var(--blu2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🐄</div>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', lineHeight: 1.2 }}>VAHD · AHIS</div>
            <div style={{ fontSize: 8, color: 'var(--txt3)', lineHeight: 1.2 }}>Govt of Telangana · 2026</div>
          </div>
        </div>

        {/* Nav links — scroll when needed; .top-nav-scroll styles scrollbar in index.css */}
        <div
          className="top-nav-scroll"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '3px 0 5px',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            scrollBehavior: 'smooth',
          }}
        >
          {NAV_ITEMS.map((item, i) =>
            item.group
              ? <NavGroup key={i} item={item} />
              : (
                <NavLink key={item.to} to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0,
                    padding: '5px 10px', borderRadius: 8, textDecoration: 'none',
                    fontSize: 12, fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--blu)' : 'var(--txt)',
                    background: isActive ? 'var(--blu-lt)' : 'transparent',
                    whiteSpace: 'nowrap',
                    transition: 'background .15s, color .15s',
                  })}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>{item.label}
                </NavLink>
              )
          )}
        </div>

        {/* Right side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          justifyContent: 'flex-end',
        }}>
          {/* Date */}
          <span style={{
            background: 'var(--gld-lt)', color: 'var(--gld)', border: '1px solid var(--gld-bdr)',
            borderRadius: 18, padding: '2px 7px', fontSize: 8, fontWeight: 600,
          }}>📅 {today}</span>

          {/* Pending sync badge */}
          {pendingCount > 0 && (
            <button onClick={triggerSync} disabled={isSyncing} style={{
              background: 'var(--amb-lt)', color: 'var(--amb)', border: '1px solid var(--amb-bdr)',
              borderRadius: 18, padding: '2px 7px', fontSize: 8, fontWeight: 600,
              cursor: 'pointer',
            }}>
              {isSyncing ? '⟳ Syncing…' : `⇄ ${pendingCount} pending`}
            </button>
          )}

          {/* User menu */}
          <div ref={userRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowUser(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '2px 7px 2px 2px', borderRadius: 18,
              border: '1px solid var(--bdr)', background: 'var(--bg)',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg,var(--blu),var(--blu2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('') || 'VO'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.2 }}>
                  {user?.name?.split(' ').slice(-1)[0] || 'Officer'}
                </div>
                <div style={{ fontSize: 8, color: 'var(--txt3)', lineHeight: 1.2 }}>{user?.role?.toUpperCase()}</div>
              </div>
            </button>

            {showUser && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                minWidth: 200, background: '#fff', border: '1px solid rgba(226, 232, 240, 0.95)',
                borderRadius: 16, boxShadow: '0 12px 42px rgba(15, 23, 42, 0.12), 0 4px 14px rgba(15, 23, 42, 0.06)',
                zIndex: 500, padding: 6,
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{user?.email}</div>
                </div>
                <button onClick={() => { navigate('/sync'); setShowUser(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  borderRadius: 6, border: 'none', background: 'transparent',
                  width: '100%', textAlign: 'left', fontSize: 12, color: 'var(--txt2)',
                  cursor: 'pointer', fontFamily: 'var(--fb)',
                }}>⇄ Sync Status</button>
                <button onClick={() => { logout(); setShowUser(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  borderRadius: 6, border: 'none', background: 'transparent',
                  width: '100%', textAlign: 'left', fontSize: 12, color: 'var(--red)',
                  cursor: 'pointer', fontFamily: 'var(--fb)',
                }}>⎋ Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}