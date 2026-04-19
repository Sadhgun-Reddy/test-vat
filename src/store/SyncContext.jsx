// src/store/SyncContext.jsx — Makes sync state available to all components
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncManager } from '../sync/syncManager';
import { getPendingCount, getUnresolvedConflicts } from '../sync/offlineStore';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SyncCtx = createContext(null);

export function SyncProvider({ children }) {
  const { isAuthenticated, isDemoSession } = useAuth();
  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const [isSyncing, setIsSyncing]     = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts]     = useState([]);
  const [lastSynced, setLastSynced]   = useState(null);

  const refreshPending = useCallback(async () => {
    const n = await getPendingCount();
    setPendingCount(n);
    const c = await getUnresolvedConflicts();
    setConflicts(c);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    syncManager
      .on('onSyncStart',    ()       => setIsSyncing(true))
      .on('onSyncEnd',      (result) => {
        setIsSyncing(false);
        setLastSynced(new Date());
        refreshPending();
        if (result?.push?.conflicts > 0) {
          toast.error(`${result.push.conflicts} sync conflict(s) need attention`);
        } else if (!result?.skipped && !result?.error) {
          toast.success('Data synced successfully');
        }
      })
      .on('onConflict',     (c)      => setConflicts(prev => [c, ...prev]))
      .on('onOnlineChange', (online) => {
        setIsOnline(online);
        toast[online ? 'success' : 'error'](online ? 'Back online — syncing…' : 'You are offline');
      });

    syncManager.startAutoSync();
    refreshPending();

    return () => syncManager.stopAutoSync();
  }, [isAuthenticated, isDemoSession, refreshPending]);

  const triggerSync = useCallback(async () => {
    if (!isOnline) { toast.error('Cannot sync while offline'); return; }
    return syncManager.sync();
  }, [isOnline]);

  return (
    <SyncCtx.Provider value={{
      isOnline, isSyncing, pendingCount, conflicts,
      lastSynced, triggerSync, refreshPending,
    }}>
      {children}
    </SyncCtx.Provider>
  );
}

export const useSync = () => {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};