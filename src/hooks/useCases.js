// src/hooks/useCases.js — Offline-first cases hook
// Pattern used across all CRUD modules.
// Reads from IndexedDB first, syncs to server in background.
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertAndEnqueue, getAll, getById } from '../sync/offlineStore';
import { syncManager } from '../sync/syncManager';
import { useSync } from '../store/SyncContext';
import toast from 'react-hot-toast';

const TABLE = 'case_treated';

// ── List (offline-first) ──────────────────────────────────────
export function useCases(filters = {}) {
  const { isOnline } = useSync();

  return useQuery({
    queryKey: ['cases', filters],
    queryFn: async () => {
      if (isOnline) {
        // Prefer server data when online
        const params = new URLSearchParams(
          Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
        );
        const { data } = await syncManager.api.get(`/cases?${params}`);
        return data;
      }
      // Fallback to IndexedDB
      const records = await getAll(TABLE, { districtId: filters.district_id });
      return { cases: records, total: records.length };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ── Single record ─────────────────────────────────────────────
export function useCase(id) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: async () => {
      try {
        const { data } = await syncManager.api.get(`/cases/${id}`);
        return data;
      } catch {
        return getById(TABLE, id);
      }
    },
    enabled: !!id,
  });
}

// ── Create (offline-first) ────────────────────────────────────
export function useCreateCase() {
  const qc = useQueryClient();
  const { isOnline, refreshPending } = useSync();

  return useMutation({
    mutationFn: async (formData) => {
      if (isOnline) {
        // Online: go direct to server, no queue
        const { data } = await syncManager.api.post('/cases', formData);
        return data;
      }
      // Offline: write to IndexedDB + enqueue
      return upsertAndEnqueue(TABLE, formData, 'INSERT');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Case recorded');
      refreshPending();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save case');
    },
  });
}

// ── Update ────────────────────────────────────────────────────
export function useUpdateCase() {
  const qc = useQueryClient();
  const { isOnline, refreshPending } = useSync();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      if (isOnline) {
        const { data } = await syncManager.api.put(`/cases/${id}`, updates);
        return data;
      }
      const existing = await getById(TABLE, id);
      return upsertAndEnqueue(TABLE, { ...existing, ...updates, id }, 'UPDATE');
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['cases', vars.id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Case updated');
      refreshPending();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });
}