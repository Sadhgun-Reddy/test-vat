import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '../../services/api/dashboard.service';
import { queryKeys } from './queryKeys';

export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.data(),
    queryFn: getDashboardData,
    staleTime: 1000 * 60 * 2, // Dashboard refreshes every 2 minutes
  });
};
