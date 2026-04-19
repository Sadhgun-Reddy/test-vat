import { QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { syncManager } from '../../../sync/syncManager';
import { ID } from '../config/types';

type UseGenericCRUDOptions = {
  endpoint: string; // e.g. '/settings/institutions'
  queryKey: QueryKey;
  paginated?: boolean;
  softDeletePut?: boolean;
};

const DEFAULT_PAGE_SIZE = 50;

export const useGenericCRUD = <T extends { id: ID }>({
  endpoint,
  queryKey,
  paginated = false,
  softDeletePut = false,
}: UseGenericCRUDOptions) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // We use standard React debouncing pattern or just pass the search
  // For simplicity we will handle debouncing in the component, or just use `search`
  // directly here if the component debounces `setSearch`.

  // LIST
  const listQuery = useQuery({
    queryKey: [...queryKey, { page, search, paginated }],
    queryFn: async () => {
      if (paginated) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_PAGE_SIZE),
        });
        if (search.trim()) {
          params.set('search', search.trim());
        }
        // Always include active_only for paginated standard endpoints,
        // to mimic existing SettingsPage behavior if necessary.
        // E.g. districts, mandals, towns, institution-types.
        // The original component checked `if (config.key === 'districts' || ...)`
        // We can just append it universally or pass it via config if needed.
        params.set('active_only', 'true');

        const { data } = await syncManager.api.get(`${endpoint}?${params}`);
        return data; // Assuming it returns { data: T[], total: number } or similar
      } else {
        const { data } = await syncManager.api.get(endpoint);
        return Array.isArray(data) ? data : [];
      }
    },
  });

  // CREATE
  const createMutation = useMutation({
    mutationFn: async (payload: Partial<T>) => {
      const { data } = await syncManager.api.post(endpoint, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: ID; payload: Partial<T> }) => {
      const { data } = await syncManager.api.put(
        `${endpoint}/${encodeURIComponent(String(id))}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // DELETE
  const deleteMutation = useMutation({
    mutationFn: async (id: ID) => {
      if (softDeletePut) {
        await syncManager.api.put(`${endpoint}/${encodeURIComponent(String(id))}`, {
          is_active: false,
        });
        return;
      }
      await syncManager.api.delete(`${endpoint}/${encodeURIComponent(String(id))}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // IMPORT
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await syncManager.api.post(`${endpoint}/import`, fd);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Derived state
  const items = Array.isArray(listQuery.data) ? listQuery.data : (listQuery.data?.data ?? []);

  const totalItems =
    typeof listQuery.data?.total === 'number' ? listQuery.data.total : items.length;

  const totalPages =
    typeof listQuery.data?.totalPages === 'number'
      ? listQuery.data.totalPages
      : Math.ceil(totalItems / DEFAULT_PAGE_SIZE);

  return {
    items,
    totalItems,
    totalPages,
    isLoading: listQuery.isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    onCreate: async (data: Partial<T>) => {
      await createMutation.mutateAsync(data);
    },
    onUpdate: async (id: ID, data: Partial<T>) => {
      await updateMutation.mutateAsync({ id, payload: data });
    },
    onDelete: async (id: ID) => {
      await deleteMutation.mutateAsync(id);
    },
    onImport: async (file: File) => {
      await importMutation.mutateAsync(file);
    },
    page,
    setPage,
    search,
    setSearch,
    error: listQuery.error,
  };
};
