import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';

/**
 * Custom render function that wraps components with common providers
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  // Add any global providers here (e.g., ThemeProvider, QueryClientProvider)
  const AllProviders = ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
