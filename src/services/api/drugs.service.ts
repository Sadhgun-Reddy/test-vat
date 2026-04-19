import { ID, QueryFilters } from '../types/api.types';
import { CreateDrugSalePayload, Drug, DrugAllocation, DrugSale } from '../types/drugs.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

/** Get paginated list of drugs */
export const getDrugs = async (filters?: QueryFilters): Promise<PaginatedResponse<Drug[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Drug[]>>('/drugs', { params: filters });
  return data;
};

/** Get single drug by ID */
export const getDrugById = async (id: ID): Promise<Drug> => {
  const { data } = await apiClient.get<ApiResponse<Drug>>(`/drugs/${id}`);
  return data.data;
};

/** Create a new drug sale */
export const createDrugSale = async (payload: CreateDrugSalePayload): Promise<DrugSale> => {
  const { data } = await apiClient.post<ApiResponse<DrugSale>>('/drugs/sales', payload);
  return data.data;
};

/** Get drug sales history */
export const getDrugSales = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<DrugSale[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<DrugSale[]>>('/drugs/sales', {
    params: filters,
  });
  return data;
};

/** Update drug stock quantity */
export const updateDrugStock = async (id: ID, quantity: number): Promise<Drug> => {
  const { data } = await apiClient.put<ApiResponse<Drug>>(`/drugs/${id}/stock`, { quantity });
  return data.data;
};

/** Get drug allocations */
export const getDrugAllocations = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<DrugAllocation[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<DrugAllocation[]>>('/drugs/allocations', {
    params: filters,
  });
  return data;
};
