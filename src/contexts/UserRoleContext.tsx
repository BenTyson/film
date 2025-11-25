'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

interface UserRoleContextValue {
  isAdmin: boolean;
  isLoading: boolean;
  userId: number | null;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  isAdmin: false,
  isLoading: true,
  userId: null,
  refetch: async () => {},
});

interface UserRoleProviderProps {
  children: ReactNode;
}

/**
 * Provider that fetches user role once and provides it to all child components.
 * This eliminates the N+1 API calls that would occur if each component fetched independently.
 */
export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const fetchUserRole = useCallback(async () => {
    if (!isSignedIn) {
      setIsAdmin(false);
      setUserId(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/me');
      if (!response.ok) {
        setIsAdmin(false);
        setUserId(null);
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setIsAdmin(data.data.role === 'admin');
        setUserId(data.data.id);
      } else {
        setIsAdmin(false);
        setUserId(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setIsAdmin(false);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      fetchUserRole();
    }
  }, [isLoaded, fetchUserRole]);

  return (
    <UserRoleContext.Provider
      value={{
        isAdmin,
        isLoading,
        userId,
        refetch: fetchUserRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

/**
 * Hook to access user role information.
 * Must be used within a UserRoleProvider.
 */
export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
