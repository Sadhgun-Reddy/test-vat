import { syncManager } from '../../sync/syncManager';

export const apiClient = syncManager.api;

export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
};

export type PaginatedResponse<T> = ApiResponse<T> & {
  total: number;
  page: number;
  limit: number;
};
