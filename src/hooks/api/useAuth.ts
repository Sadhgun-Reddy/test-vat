import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authService } from '../../services';
import { LoginCredentials } from '../../services/types/auth.types';
import { queryKeys } from './queryKeys';

/** Fetch the currently authenticated user */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: authService.getCurrentUser,
    staleTime: Infinity, // User data doesn't change mid-session
  });
};

/** Login mutation */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      // Cache the user data immediately after login
      queryClient.setQueryData(queryKeys.auth.currentUser(), data.user);
    },
  });
};

/** Logout mutation */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
  });
};
