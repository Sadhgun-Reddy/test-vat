// src/components/layout/AppShell.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSync } from '../../store/SyncContext';
import TopNav from './TopNav';
import OfflineBanner from './OfflineBanner';
import InternalBot from '../bot/InternalBot';

export default function AppShell(): JSX.Element {
  const { isOnline, pendingCount } = useSync();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg1)',
    }}>
      {/* Primary navigation bar */}
      <TopNav />

      {/* Offline indicator banner */}
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Page content area */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Outlet />
      </main>

      {/* Internal information chatbot */}
      <InternalBot />
    </div>
  );
}