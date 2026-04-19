import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { Budget, Designation, Institution } from '../../services/types/settings.types';
import { queryKeys } from './queryKeys';

// --- Institutions ---
export const useInstitutions = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.settings.institutions(filters),
    queryFn: () => settingsService.getInstitutions(filters),
  });
};

export const useCreateInstitution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Institution, 'id'>) => settingsService.createInstitution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.institutions() });
    },
  });
};

export const useUpdateInstitution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: ID; payload: Partial<Institution> }) =>
      settingsService.updateInstitution(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.institutions() });
    },
  });
};

export const useDeleteInstitution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => settingsService.deleteInstitution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.institutions() });
    },
  });
};

// --- Designations ---
export const useDesignations = () => {
  return useQuery({
    queryKey: queryKeys.settings.designations(),
    queryFn: settingsService.getDesignations,
    staleTime: Infinity, // Designations rarely change
  });
};

export const useCreateDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Designation, 'id'>) => settingsService.createDesignation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.designations() });
    },
  });
};

// --- Policies ---
export const usePolicies = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.settings.policies(filters),
    queryFn: () => settingsService.getPolicies(filters),
  });
};

// --- Budget ---
export const useBudgetAllocations = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.settings.budget(filters),
    queryFn: () => settingsService.getBudgetAllocations(filters),
  });
};

export const useCreateBudgetAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Budget, 'id' | 'spent'>) =>
      settingsService.createBudgetAllocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.budget() });
    },
  });
};

export const useUpdateBudgetAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: ID; payload: Partial<Budget> }) =>
      settingsService.updateBudgetAllocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.budget() });
    },
  });
};
