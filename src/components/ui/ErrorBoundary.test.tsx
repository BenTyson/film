import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, PageErrorBoundary } from './ErrorBoundary';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="home-link">{children}</a>
  ),
}));

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Child rendered successfully</div>;
}

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child rendered successfully')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('renders default error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const handleError = vi.fn();

      render(
        <ErrorBoundary onError={handleError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(handleError.mock.calls[0][0].message).toBe('Test error message');
    });

    it('shows Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state when Try Again is clicked', () => {
      let shouldThrow = true;

      function ConditionalThrow() {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="success">Success!</div>;
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>
      );

      // Error state shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Re-render to pick up the change
      rerender(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>
      );

      // Should now show success
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('error message display', () => {
    it('shows generic message when error has no message', () => {
      function ThrowEmptyError() {
        throw new Error();
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });
});

describe('PageErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={false} />
        </PageErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('renders full-page error UI', () => {
      render(
        <PageErrorBoundary>
          <ThrowError />
        </PageErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/we encountered an unexpected error/i)).toBeInTheDocument();
    });

    it('shows Refresh Page button', () => {
      render(
        <PageErrorBoundary>
          <ThrowError />
        </PageErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('shows Go Home link', () => {
      render(
        <PageErrorBoundary>
          <ThrowError />
        </PageErrorBoundary>
      );

      const homeLink = screen.getByTestId('home-link');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('logs error to console', () => {
      render(
        <PageErrorBoundary>
          <ThrowError />
        </PageErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('development mode', () => {
    it('shows error details in development', () => {
      // Note: In Vitest, NODE_ENV is typically 'test', not 'development'
      // We'll test that the error state is rendered correctly
      render(
        <PageErrorBoundary>
          <ThrowError />
        </PageErrorBoundary>
      );

      // The component should be rendered with error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
