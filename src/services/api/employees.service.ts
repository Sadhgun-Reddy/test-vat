import { ID, QueryFilters } from '../types/api.types';
import { AttendanceRecord, Employee } from '../types/employees.types';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

/** Get paginated list of employees */
export const getEmployees = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<Employee[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<Employee[]>>('/employees', {
    params: filters,
  });
  return data;
};

/** Get single employee by ID */
export const getEmployeeById = async (id: ID): Promise<Employee> => {
  const { data } = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
  return data.data;
};

/** Get attendance records */
export const getAttendance = async (
  filters?: QueryFilters
): Promise<PaginatedResponse<AttendanceRecord[]>> => {
  const { data } = await apiClient.get<PaginatedResponse<AttendanceRecord[]>>('/attendance', {
    params: filters,
  });
  return data;
};

/** Mark employee attendance */
export const markAttendance = async (
  employeeId: ID,
  record: Omit<AttendanceRecord, 'id' | 'employeeId'>
): Promise<AttendanceRecord> => {
  const { data } = await apiClient.post<ApiResponse<AttendanceRecord>>('/attendance', {
    employeeId,
    ...record,
  });
  return data.data;
};
