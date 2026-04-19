import { ID, QueryFilters } from '../types/api.types';
import { Purchase, PurchaseOrder } from '../types/procurement.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

/** Get paginated list of purchase orders */
export const getPurchaseOrders = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<PurchaseOrder[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<PurchaseOrder[]>>('/purchase-orders', {
    params: filters,
  });
  return data;
};

/** Get single purchase order by ID */
export const getPurchaseOrderById = async (id: ID): Promise<PurchaseOrder> => {
  const { data } = await apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
  return data.data;
};

/** Get paginated list of purchases */
export const getPurchases = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<Purchase[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Purchase[]>>('/purchases', {
    params: filters,
  });
  return data;
};

/** Create a purchase order */
export const createPurchaseOrder = async (payload: any): Promise<PurchaseOrder> => {
  const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', payload);
  return data.data;
};

/** Save a draft purchase order */
export const createPurchaseOrderDraft = async (payload: any): Promise<PurchaseOrder> => {
  const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
    '/purchase-orders/draft',
    payload
  );
  return data.data;
};

/** Update a purchase order */
export const updatePurchaseOrder = async (id: ID, payload: any): Promise<PurchaseOrder> => {
  const { data } = await apiClient.patch<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${id}`,
    payload
  );
  return data.data;
};

/** Save a purchase */
export const createPurchase = async (payload: any): Promise<Purchase> => {
  const { data } = await apiClient.post<ApiResponse<Purchase>>('/purchases', payload);
  return data.data;
};
