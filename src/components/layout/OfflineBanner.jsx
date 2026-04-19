// src/components/layout/OfflineBanner.jsx
import React from 'react';

export default function OfflineBanner({ pendingCount }) {
  return (
    <div
      style={{
        background: 'var(--amb-lt)',
        borderBottom: '1px solid var(--amb-bdr)',
        padding: '7px clamp(12px,2vw,32px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--amb)',
        flexShrink: 0,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700 }}>○ Offline Mode</span>
        <span>—</span>
        <span>
          Data saved locally.
          {pendingCount > 0 &&
            ` ${pendingCount} record${pendingCount > 1 ? 's' : ''} queued for sync.`}
          {' '}Will sync automatically when connection restores.
        </span>
      </div>
      {pendingCount > 0 && (
        <span
          style={{
            background: 'var(--amb)',
            color: '#fff',
            borderRadius: 20,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}