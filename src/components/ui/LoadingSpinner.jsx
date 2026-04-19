// src/components/ui/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ fullPage, size = 32 }) {
  const spinner = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${size / 10}px solid var(--bdr)`,
        borderTopColor: 'var(--blu)',
        animation: 'spin .7s linear infinite',
        flexShrink: 0,
      }}
    />
  );

  if (!fullPage) return spinner;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg1)',
        gap: 14,
      }}
    >
      {spinner}
      <div style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
        Loading VAHD AHIS…
      </div>
    </div>
  );
}