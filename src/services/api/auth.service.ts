import { AuthResponse, AuthUser, LoginCredentials } from '../types/auth.types';
import { apiClient, ApiResponse } from './client';

/** Authenticate user with username and password */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  return data.data;
};

/** Logout and invalidate token */
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

/** Get current authenticated user profile */
export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
  return data.data;
};

/** Refresh access token */
export const refreshToken = async (token: string): Promise<{ token: string }> => {
  const { data } = await apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh', { token });
  return data.data;
};
