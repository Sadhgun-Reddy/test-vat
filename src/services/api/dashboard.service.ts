import { apiClient, ApiResponse } from './client';
import { DashboardResponse } from '../types/dashboard.types';

/** Fetch main dashboard statistics and map data */
export const getDashboardData = async (): Promise<DashboardResponse> => {
  const { data } = await apiClient.get<ApiResponse<DashboardResponse>>('/dashboard');
  return data.data;
};
