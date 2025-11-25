'use client';

import { ReactNode } from 'react';
import { UserRoleProvider } from '@/contexts';
import { PageErrorBoundary } from '@/components/ui';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Wraps the app with all necessary context providers and error boundary.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <PageErrorBoundary>
      <UserRoleProvider>
        {children}
      </UserRoleProvider>
    </PageErrorBoundary>
  );
}
