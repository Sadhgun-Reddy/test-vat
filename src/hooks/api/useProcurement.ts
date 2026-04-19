import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { procurementService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { queryKeys } from './queryKeys';

export const usePurchaseOrders = (filters?: QueryFilters & { enabled?: boolean }) => {
  const { enabled, ...restFilters } = filters || {};
  return useQuery({
    queryKey: queryKeys.procurement.purchaseOrders(restFilters),
    queryFn: () => procurementService.getPurchaseOrders(restFilters),
    enabled: enabled !== false,
  });
};

export const usePurchases = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.procurement.purchases(filters),
    queryFn: () => procurementService.getPurchases(filters),
  });
};

export const usePurchasesForPO = (poId: ID, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.procurement.purchasesForPO(poId),
    queryFn: async () => {
      const res = await procurementService.getPurchases({ purchase_order_id: poId, limit: 50 });
      return res.data || res; // depending on your API structure. The old code accessed data.purchases or res directly
    },
    enabled: !!poId && options?.enabled !== false,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => procurementService.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.purchaseOrders() });
    },
  });
};

export const useCreatePurchaseOrderDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => procurementService.createPurchaseOrderDraft(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.purchaseOrders() });
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: ID; payload: any }) =>
      procurementService.updatePurchaseOrder(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.purchaseOrders() });
    },
  });
};

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => procurementService.createPurchase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.purchaseOrders() });
    },
  });
};
