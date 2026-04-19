import { ID, QueryFilters } from '../types/api.types';
import { ClinicalCase, CreateCasePayload } from '../types/cases.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

/** Get paginated list of clinical cases */
export const getCases = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<ClinicalCase[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<ClinicalCase[]>>('/cases', {
    params: filters,
  });
  return data;
};

/** Get single case by ID */
export const getCaseById = async (id: ID): Promise<ClinicalCase> => {
  const { data } = await apiClient.get<ApiResponse<ClinicalCase>>(`/cases/${id}`);
  return data.data;
};

/** Create a new clinical case */
export const createCase = async (payload: CreateCasePayload): Promise<ClinicalCase> => {
  const { data } = await apiClient.post<ApiResponse<ClinicalCase>>('/cases', payload);
  return data.data;
};

/** Update an existing case */
export const updateCase = async (
  id: ID,
  payload: Partial<CreateCasePayload>
): Promise<ClinicalCase> => {
  const { data } = await apiClient.put<ApiResponse<ClinicalCase>>(`/cases/${id}`, payload);
  return data.data;
};

/** Close a clinical case */
export const closeCase = async (id: ID): Promise<ClinicalCase> => {
  const { data } = await apiClient.patch<ApiResponse<ClinicalCase>>(`/cases/${id}/close`);
  return data.data;
};
