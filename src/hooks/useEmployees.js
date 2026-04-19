// src/hooks/useEmployees.js — Offline-first employee data hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertAndEnqueue, getAll, getById } from '../sync/offlineStore';
import { syncManager } from '../sync/syncManager';
import { useSync } from '../store/SyncContext';
import toast from 'react-hot-toast';

const TABLE = 'employees';

export function useEmployees(filters = {}) {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: async () => {
      if (isOnline) {
        const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
        const { data } = await syncManager.api.get(`/employees?${params}`);
        return data;
      }
      const records = await getAll(TABLE);
      return { employees: records, total: records.length };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  const { isOnline, refreshPending } = useSync();
  return useMutation({
    mutationFn: async (formData) => {
      if (isOnline) { const { data } = await syncManager.api.post('/employees', formData); return data; }
      return upsertAndEnqueue(TABLE, formData, 'INSERT');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee registered'); refreshPending(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  const { isOnline, refreshPending } = useSync();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      if (isOnline) { const { data } = await syncManager.api.put(`/employees/${id}`, updates); return data; }
      const existing = await getById(TABLE, id);
      return upsertAndEnqueue(TABLE, { ...existing, ...updates, id }, 'UPDATE');
    },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['employees', id] }); qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee updated'); refreshPending(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });
}

// src/hooks/useAttendance.js
export function useAttendance(date) {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      if (isOnline) { const { data } = await syncManager.api.get(`/attendance?date=${date}`); return data; }
      const records = await getAll('attendance');
      const filtered = records.filter(r => r.date === date);
      return { attendance: filtered, summary: {}, date };
    },
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  const { isOnline, refreshPending } = useSync();
  return useMutation({
    mutationFn: async ({ date, records }) => {
      if (isOnline) { const { data } = await syncManager.api.post('/attendance/bulk', { date, records }); return data; }
      for (const rec of records) {
        await upsertAndEnqueue('attendance', { ...rec, date, sync_status: 'pending' }, 'INSERT');
      }
      return { saved: records.length, date };
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['attendance', data.date] }); toast.success(`Attendance saved for ${data.saved} staff`); refreshPending(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save attendance'),
  });
}

// src/hooks/useDrugs.js
export function useDrugs(filters = {}) {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['drugs', filters],
    queryFn: async () => {
      if (isOnline) {
        const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
        const { data } = await syncManager.api.get(`/drugs?${params}`);
        return data;
      }
      const records = await getAll('drugs');
      return { drugs: records, total: records.length };
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
}

export function useStockLevels() {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['stock-levels'],
    queryFn: async () => {
      if (!isOnline) return { stock: [] };
      const { data } = await syncManager.api.get('/stock/levels');
      return data;
    },
    refetchInterval: isOnline ? 60_000 : false,
    staleTime: 30_000,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await syncManager.api.post('/stock/adjust', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-levels'] }); qc.invalidateQueries({ queryKey: ['drugs'] }); toast.success('Stock adjusted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Stock adjustment failed'),
  });
}

// src/hooks/useDashboard.js
export function useDashboard() {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!isOnline) return null;
      const { data } = await syncManager.api.get('/dashboard');
      return data;
    },
    refetchInterval: isOnline ? 60_000 : false,
    staleTime: 30_000,
  });
}

// src/hooks/useReports.js
export function useReport(reportId, filters = {}) {
  const { isOnline } = useSync();
  return useQuery({
    queryKey: ['report', reportId, filters],
    queryFn: async () => {
      if (!isOnline) return { report: [] };
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await syncManager.api.get(`/reports/${reportId}?${params}`);
      return data;
    },
    enabled: !!reportId && isOnline,
    staleTime: 60_000,
  });
}