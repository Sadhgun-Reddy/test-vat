// src/components/ui/index.jsx
// ─── Shared UI primitives ──────────────────────────────────────
import React, { useEffect } from 'react';

// ── Page wrapper ──────────────────────────────────────────────
export function PageWrap({ children }) {
  return (
    <div style={{
      maxWidth: 2400, margin: '0 auto',
      padding: 'clamp(8px, 1vw, 14px) clamp(12px, 2vw, 36px) clamp(18px, 2vw, 28px)',
    }}>
      {children}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────
export function PageHead({ title, subtitle, actions, crumbs }) {
  return (
    <>
      {crumbs && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, marginTop: 2 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--txt4)', fontSize: 11 }}>›</span>}
              <span style={{ fontSize: 11, color: i === crumbs.length - 1 ? 'var(--txt2)' : 'var(--txt4)', fontWeight: i === crumbs.length - 1 ? 500 : 400 }}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(18px,1.8vw,26px)', fontWeight: 700, color: 'var(--txt)', margin: 0, lineHeight: 1.2 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2, marginBottom: 0 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>}
      </div>
    </>
  );
}

// ── KPI card ──────────────────────────────────────────────────
const COLOR_MAP = {
  blue:   { before: 'linear-gradient(90deg,var(--blu),var(--blu3))', key: 'k-blu' },
  green:  { before: 'var(--grn)', key: 'k-grn' },
  gold:   { before: 'linear-gradient(90deg,var(--gld),var(--gld3))', key: 'k-gld' },
  amber:  { before: 'var(--amb)', key: 'k-amb' },
  red:    { before: 'var(--red)', key: 'k-red' },
  purple: { before: 'var(--pur)', key: 'k-pur' },
  teal:   { before: 'var(--tel)', key: 'k-tel' },
};

export function KPICard({ label, value, sub, delta, color = 'blue', onClick }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10,
        padding: 'clamp(10px,1vw,14px)', position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--sh1)', cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--sh2)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='var(--sh1)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.before }} />
      <div style={{ fontSize: 9, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(22px,2vw,30px)', fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub   && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4 }}>{sub}</div>}
      {delta && <div style={{ fontSize: 10, fontWeight: 600, color: delta.startsWith('↑') ? 'var(--grn)' : 'var(--red)', marginTop: 3 }}>{delta}</div>}
    </div>
  );
}

// ── KPI grid ──────────────────────────────────────────────────
export function KPIGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10, boxShadow: 'var(--sh1)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

export function CardHead({ title, sub, children }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function CardBody({ children, noPad }) {
  return (
    <div style={noPad ? {} : { padding: 'clamp(12px,1.2vw,18px)' }}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
const BADGE = {
  green:  { bg: 'var(--grn-lt)', color: 'var(--grn)', border: 'var(--grn-bdr)' },
  red:    { bg: 'var(--red-lt)', color: 'var(--red)', border: 'var(--red-bdr)' },
  blue:   { bg: 'var(--blu-lt)', color: 'var(--blu)', border: 'var(--blu-bdr)' },
  amber:  { bg: 'var(--amb-lt)', color: 'var(--amb)', border: 'var(--amb-bdr)' },
  gold:   { bg: 'var(--gld-lt)', color: 'var(--gld)', border: 'var(--gld-bdr)' },
  purple: { bg: 'var(--pur-lt)', color: 'var(--pur)', border: 'var(--pur-bdr)' },
  teal:   { bg: 'var(--tel-lt)', color: 'var(--tel)', border: 'var(--tel-bdr)' },
  dim:    { bg: 'var(--bg2)',    color: 'var(--txt3)', border: 'var(--bdr)'    },
};
export function Badge({ color = 'dim', children, style }) {
  const s = BADGE[color] || BADGE.dim;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 'clamp(9px,.75vw,11px)', fontWeight: 600, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, ...style,
    }}>{children}</span>
  );
}

// Outcome → badge colour mapping
export const outcomeColor = o => ({ recovered:'green', referred:'blue', died:'red', ongoing:'amber' }[o] || 'dim');
export const syncColor    = s => s === 'synced' ? 'green' : s === 'conflict' ? 'red' : 'amber';

// ── Button ────────────────────────────────────────────────────
const BTN = {
  primary: { bg:'var(--blu)', color:'#fff', border:'var(--blu)' },
  success: { bg:'var(--grn)', color:'#fff', border:'var(--grn)' },
  danger:  { bg:'var(--red)', color:'#fff', border:'var(--red)' },
  ghost:   { bg:'var(--bg)',  color:'var(--txt2)', border:'var(--bdr)' },
  outline: { bg:'transparent', color:'var(--blu)', border:'var(--blu-bdr)' },
};
export function Btn({ variant='ghost', size='md', disabled, onClick, children, type='button', block }) {
  const v = BTN[variant] || BTN.ghost;
  const pad = size === 'sm' ? '4px 10px' : size === 'xs' ? '3px 8px' : size === 'lg' ? '10px 22px' : '6px 14px';
  const fs  = size === 'sm' ? 11 : size === 'xs' ? 10 : size === 'lg' ? 14 : 12;
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 6, border: `1px solid ${v.border}`,
      background: v.bg, color: v.color, fontSize: fs, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1,
      transition: 'all .12s', fontFamily: 'var(--fb)', whiteSpace: 'nowrap',
      width: block ? '100%' : 'auto', justifyContent: block ? 'center' : 'flex-start',
    }}>{children}</button>
  );
}

// ── Simple data table ─────────────────────────────────────────
export function DataTable({ columns, data, emptyMsg = 'No records found', loading }) {
  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading…</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                padding: 'clamp(8px,.7vw,10px) clamp(10px,.9vw,14px)',
                textAlign: col.align || 'left', fontSize: 'clamp(9px,.75vw,11px)',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                color: 'var(--txt3)', background: 'var(--bg1)',
                borderBottom: '2px solid var(--bdr)', whiteSpace: 'nowrap',
              }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length
            ? <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: 'var(--txt3)', fontSize: 13 }}>{emptyMsg}</td></tr>
            : data.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--bdr)' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg1)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                {columns.map((col, ci) => (
                  <td key={ci} style={{
                    padding: 'clamp(9px,.8vw,11px) clamp(10px,.9vw,14px)',
                    fontSize: 'clamp(11px,.85vw,13px)', verticalAlign: 'middle',
                    textAlign: col.align || 'left', ...col.tdStyle,
                  }}>
                    {col.render ? col.render(row[col.key], row, ri) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ title, sub, onClose, children, footer, size = 'md', accentHeader = false, zIndex = 1000, closeOnEscape = true }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape' || !closeOnEscape) return;
      onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, closeOnEscape]);

  const maxW = { sm: 480, md: 640, lg: 860, xl: 1100, xxl: 1200 }[size] || 640;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
      zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        width: '100%', maxWidth: maxW, overflow: 'hidden',
        animation: 'modalIn .18s ease',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: accentHeader ? 'none' : '1px solid var(--bdr)',
          background: accentHeader ? 'var(--grn)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: accentHeader ? '#fff' : 'var(--txt)' }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: accentHeader ? 'rgba(255,255,255,.85)' : 'var(--txt3)', marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: accentHeader ? 'rgba(255,255,255,.2)' : 'var(--bg2)',
            cursor: 'pointer', fontSize: 14, color: accentHeader ? '#fff' : 'var(--txt3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
        {footer && <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bdr)', background: 'var(--bg1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────
export default function LoadingSpinner({ fullPage }) {
  const spinner = (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '3px solid var(--bdr)', borderTopColor: 'var(--blu)',
      animation: 'spin .7s linear infinite',
    }} />
  );
  if (!fullPage) return spinner;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg1)' }}>
      {spinner}
    </div>
  );
}

// ── Form field helpers ────────────────────────────────────────
export function Field({ label, required, children, error, help }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 10, color: 'var(--red)' }}>{error}</div>}
      {help  && <div style={{ fontSize: 10, color: 'var(--txt4)' }}>{help}</div>}
    </div>
  );
}

export const inputStyle = (err) => ({
  padding: '7px 10px', border: `1px solid ${err ? 'var(--red)' : 'var(--bdr2)'}`,
  borderRadius: 6, fontSize: 13, color: 'var(--txt)', background: 'var(--bg)',
  outline: 'none', width: '100%', fontFamily: 'var(--fb)',
  transition: 'border-color .12s',
});

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'clamp(32px,4vw,60px) 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--blu-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>{icon}</div>
      <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)', marginBottom: 6 }}>{title}</h4>
      {message && <p style={{ fontSize: 12, color: 'var(--txt3)', maxWidth: 300, lineHeight: 1.6 }}>{message}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}