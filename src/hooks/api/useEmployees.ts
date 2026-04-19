import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { employeesService } from '../../services';
import { ID, QueryFilters } from '../../services/types/api.types';
import { AttendanceRecord } from '../../services/types/employees.types';
import { queryKeys } from './queryKeys';

/** Fetch paginated list of employees */
export const useEmployees = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => employeesService.getEmployees(filters),
  });
};

/** Fetch single employee by ID */
export const useEmployeeById = (id: ID) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesService.getEmployeeById(id),
    enabled: !!id,
  });
};

/** Fetch attendance records */
export const useAttendance = (filters?: QueryFilters) => {
  return useQuery({
    queryKey: queryKeys.employees.attendance(filters),
    queryFn: () => employeesService.getAttendance(filters),
  });
};

/** Mark attendance for an employee */
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      record,
    }: {
      employeeId: ID;
      record: Omit<AttendanceRecord, 'id' | 'employeeId'>;
    }) => employeesService.markAttendance(employeeId, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.attendance() });
    },
  });
};
