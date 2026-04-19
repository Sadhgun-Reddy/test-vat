import { ID, QueryFilters } from '../types/api.types';
import { Budget, Designation, Institution, Policy } from '../types/settings.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

// --- Institutions ---
export const getInstitutions = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<Institution[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Institution[]>>('/settings/institutions', {
    params: filters,
  });
  return data;
};

export const createInstitution = async (payload: Omit<Institution, 'id'>): Promise<Institution> => {
  const { data } = await apiClient.post<ApiResponse<Institution>>(
    '/settings/institutions',
    payload
  );
  return data.data;
};

export const updateInstitution = async (
  id: ID,
  payload: Partial<Institution>
): Promise<Institution> => {
  const { data } = await apiClient.put<ApiResponse<Institution>>(
    `/settings/institutions/${id}`,
    payload
  );
  return data.data;
};

export const deleteInstitution = async (id: ID): Promise<void> => {
  await apiClient.delete(`/settings/institutions/${id}`);
};

// --- Designations ---
export const getDesignations = async (): Promise<Designation[]> => {
  const { data } = await apiClient.get<ApiResponse<Designation[]>>('/settings/designations');
  return data.data;
};

export const createDesignation = async (payload: Omit<Designation, 'id'>): Promise<Designation> => {
  const { data } = await apiClient.post<ApiResponse<Designation>>(
    '/settings/designations',
    payload
  );
  return data.data;
};

// --- Policies ---
export const getPolicies = async (filters?: QueryFilters): Promise<PaginatedResponse<Policy[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Policy[]>>('/settings/policies', {
    params: filters,
  });
  return data;
};

// --- Budget ---
export const getBudgetAllocations = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<Budget[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Budget[]>>('/budget', { params: filters });
  return data;
};

export const createBudgetAllocation = async (
  payload: Omit<Budget, 'id' | 'spent'>
): Promise<Budget> => {
  const { data } = await apiClient.post<ApiResponse<Budget>>('/budget', payload);
  return data.data;
};

export const updateBudgetAllocation = async (id: ID, payload: Partial<Budget>): Promise<Budget> => {
  const { data } = await apiClient.put<ApiResponse<Budget>>(`/budget/${id}`, payload);
  return data.data;
};

import {
  BudgetAllocationForIndent,
  District,
  FinancialYear,
  InstitutionType,
  PlaceOfWorking,
  Quarter,
  Scheme,
} from '../types/settings.types';

/** Get all financial years */
export const getFinancialYears = async (): Promise<FinancialYear[]> => {
  const { data } = await apiClient.get<ApiResponse<FinancialYear[]>>('/settings/financial-years');
  return data.data;
};

/** Get all schemes */
export const getSchemes = async (): Promise<Scheme[]> => {
  const { data } = await apiClient.get<ApiResponse<Scheme[]>>('/settings/schemes');
  return data.data;
};

/** Get all quarters, optionally filtered by financial year */
export const getQuarters = async (financialYearId?: ID): Promise<Quarter[]> => {
  const { data } = await apiClient.get<ApiResponse<Quarter[]>>('/settings/quarters', {
    params: financialYearId ? { financialYearId } : undefined,
  });
  return data.data;
};

/** Get all districts */
export const getDistricts = async (): Promise<District[]> => {
  const { data } = await apiClient.get<ApiResponse<District[]>>('/districts');
  return data.data;
};

/** Get all institution types (different from institutions list) */
export const getInstitutionTypes = async (): Promise<InstitutionType[]> => {
  const { data } = await apiClient.get<ApiResponse<InstitutionType[]>>('/institution-types');
  return data.data;
};

/** Get all places of working */
export const getPlacesOfWorking = async (filters?: QueryFilters): Promise<PlaceOfWorking[]> => {
  const { data } = await apiClient.get<ApiResponse<PlaceOfWorking[]>>('/places-of-working', {
    params: filters,
  });
  return data.data;
};

/** Get budget allocations filtered for indent/sale use */
export const getBudgetAllocationsForIndent = async (filters?: {
  scheme_id?: ID;
  financial_year_id?: ID;
  quarter_id?: ID;
  institution_type_id?: ID;
}): Promise<BudgetAllocationForIndent[]> => {
  const { data } = await apiClient.get<ApiResponse<BudgetAllocationForIndent[]>>(
    '/settings/budget-allocations/for-indent',
    { params: filters }
  );
  return data.data;
};
