import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { farmersService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { Farmer } from '../../services/types/farmers.types';
import { queryKeys } from './queryKeys';

/** Fetch paginated list of farmers */
export const useFarmers = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.farmers.list(filters),
    queryFn: () => farmersService.getFarmers(filters),
  });
};

/** Fetch single farmer by ID */
export const useFarmerById = (id: ID) => {
  return useQuery({
    queryKey: queryKeys.farmers.detail(id),
    queryFn: () => farmersService.getFarmerById(id),
    enabled: !!id,
  });
};

/** Register a new farmer */
export const useRegisterFarmer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<Farmer, 'id' | 'isRegistered'>) =>
      farmersService.registerFarmer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.farmers.all() });
    },
  });
};

/** Update farmer details */
export const useUpdateFarmer = (id: ID) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Farmer>) => farmersService.updateFarmer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.farmers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.farmers.detail(id) });
    },
  });
};

/** Bulk upload farmers via FormData */
export const useBulkUploadFarmers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => farmersService.bulkUploadFarmers(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.farmers.all() });
    },
  });
};
