import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { casesService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { CreateCasePayload } from '../../services/types/cases.types';
import { queryKeys } from './queryKeys';

/** Fetch paginated list of clinical cases */
export const useCases = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: () => casesService.getCases(filters),
  });
};

/** Fetch a single clinical case by ID */
export const useCaseById = (id: ID) => {
  return useQuery({
    queryKey: queryKeys.cases.detail(id),
    queryFn: () => casesService.getCaseById(id),
    enabled: !!id, // Don't fetch if id is undefined/null
  });
};

/** Create a new clinical case */
export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCasePayload) => casesService.createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
    },
  });
};

/** Update an existing case */
export const useUpdateCase = (id: ID) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CreateCasePayload>) => casesService.updateCase(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id) });
    },
  });
};

/** Close a clinical case */
export const useCloseCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: ID) => casesService.closeCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
    },
  });
};
