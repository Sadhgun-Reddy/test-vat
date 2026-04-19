import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { drugsService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { CreateDrugSalePayload } from '../../services/types/drugs.types';
import { queryKeys } from './queryKeys';

/** Fetch paginated list of drugs */
export const useDrugs = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.drugs.list(filters),
    queryFn: () => drugsService.getDrugs(filters),
  });
};

/** Fetch single drug by ID */
export const useDrugById = (id: ID) => {
  return useQuery({
    queryKey: queryKeys.drugs.detail(id),
    queryFn: () => drugsService.getDrugById(id),
    enabled: !!id,
  });
};

/** Fetch drug sales history */
export const useDrugSales = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.drugs.sales(filters),
    queryFn: () => drugsService.getDrugSales(filters),
  });
};

/** Fetch drug allocations */
export const useDrugAllocations = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.drugs.allocations(filters),
    queryFn: () => drugsService.getDrugAllocations(filters),
  });
};

/** Create a new drug sale */
export const useCreateDrugSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDrugSalePayload) => drugsService.createDrugSale(payload),
    onSuccess: () => {
      // Invalidate both sales history and drug stock (stock changes after sale)
      queryClient.invalidateQueries({ queryKey: queryKeys.drugs.sales() });
      queryClient.invalidateQueries({ queryKey: queryKeys.drugs.list() });
    },
  });
};

/** Update drug stock quantity */
export const useUpdateDrugStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: ID; quantity: number }) =>
      drugsService.updateDrugStock(id, quantity),
    onSuccess: (updatedDrug) => {
      // Update the cache directly instead of refetching
      queryClient.setQueryData(queryKeys.drugs.detail(updatedDrug.id), updatedDrug);
      queryClient.invalidateQueries({ queryKey: queryKeys.drugs.list() });
    },
  });
};
