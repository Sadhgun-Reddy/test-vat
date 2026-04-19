import { ID, QueryFilters } from '../types/api.types';
import { Farmer } from '../types/farmers.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

/** Get paginated list of farmers */
export const getFarmers = async (filters?: QueryFilters): Promise<PaginatedResponse<Farmer[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Farmer[]>>('/farmers', {
    params: filters,
  });
  return data;
};

/** Get single farmer by ID */
export const getFarmerById = async (id: ID): Promise<Farmer> => {
  const { data } = await apiClient.get<ApiResponse<Farmer>>(`/farmers/${id}`);
  return data.data;
};

/** Register a new farmer */
export const registerFarmer = async (
  payload: Omit<Farmer, 'id' | 'isRegistered'>
): Promise<Farmer> => {
  const { data } = await apiClient.post<ApiResponse<Farmer>>('/farmers', payload);
  return data.data;
};

/** Update farmer details */
export const updateFarmer = async (id: ID, payload: Partial<Farmer>): Promise<Farmer> => {
  const { data } = await apiClient.put<ApiResponse<Farmer>>(`/farmers/${id}`, payload);
  return data.data;
};

/** Bulk upload farmers from CSV/Excel */
export const bulkUploadFarmers = async (
  formData: FormData
): Promise<{ imported: number; failed: number }> => {
  const { data } = await apiClient.post<ApiResponse<{ imported: number; failed: number }>>(
    '/farmers/bulk-upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.data;
};
