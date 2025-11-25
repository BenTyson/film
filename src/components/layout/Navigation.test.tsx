import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation } from './Navigation';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} data-testid="motion-div">{children}</div>
    ),
    button: ({ children, className }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className}>{children}</button>
    ),
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid={`nav-link-${href.replace(/\//g, '-')}`}>{children}</a>
  ),
}));

// Mock next/navigation
const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock Clerk
const mockUseUser = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}));

// Mock useUserRole
const mockUseUserRole = vi.fn();
vi.mock('@/contexts', () => ({
  useUserRole: () => mockUseUserRole(),
}));

describe('Navigation', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
    mockUseUser.mockReturnValue({ isSignedIn: true });
    mockUseUserRole.mockReturnValue({ isAdmin: false, isLoading: false });
  });

  describe('navigation items', () => {
    it('renders standard navigation items', () => {
      render(<Navigation />);

      expect(screen.getByText('Collection')).toBeInTheDocument();
      expect(screen.getByText('Oscars')).toBeInTheDocument();
      expect(screen.getByText('Watchlist')).toBeInTheDocument();
      expect(screen.getByText('Vaults')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('hides admin-only items for non-admin users', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: false, isLoading: false });
      render(<Navigation />);

      expect(screen.queryByText('Calen')).not.toBeInTheDocument();
    });

    it('shows admin-only items for admin users', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: true, isLoading: false });
      render(<Navigation />);

      expect(screen.getByText('Calen')).toBeInTheDocument();
    });

    it('hides admin-only items while loading', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: true, isLoading: true });
      render(<Navigation />);

      // Even though isAdmin is true, should hide while loading to prevent flash
      expect(screen.queryByText('Calen')).not.toBeInTheDocument();
    });

    it('renders correct links', () => {
      render(<Navigation />);

      expect(screen.getByTestId('nav-link--')).toHaveAttribute('href', '/');
      expect(screen.getByTestId('nav-link--oscars')).toHaveAttribute('href', '/oscars');
      expect(screen.getByTestId('nav-link--watchlist')).toHaveAttribute('href', '/watchlist');
      expect(screen.getByTestId('nav-link--vaults')).toHaveAttribute('href', '/vaults');
      expect(screen.getByTestId('nav-link--add')).toHaveAttribute('href', '/add');
    });

    it('renders Calen link for admins', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: true, isLoading: false });
      render(<Navigation />);

      expect(screen.getByTestId('nav-link--buddy-calen')).toHaveAttribute('href', '/buddy/calen');
    });
  });

  describe('authentication', () => {
    it('shows UserButton when signed in', () => {
      mockUseUser.mockReturnValue({ isSignedIn: true });
      render(<Navigation />);

      expect(screen.getByTestId('user-button')).toBeInTheDocument();
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('shows Sign In link when not signed in', () => {
      mockUseUser.mockReturnValue({ isSignedIn: false });
      render(<Navigation />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
    });

    it('Sign In link points to sign-in page', () => {
      mockUseUser.mockReturnValue({ isSignedIn: false });
      render(<Navigation />);

      expect(screen.getByTestId('nav-link--sign-in')).toHaveAttribute('href', '/sign-in');
    });
  });

  describe('active state', () => {
    it('renders on collection page', () => {
      mockPathname.mockReturnValue('/');
      render(<Navigation />);

      // Component renders without error on home page
      expect(screen.getByText('Collection')).toBeInTheDocument();
    });

    it('renders on oscars page', () => {
      mockPathname.mockReturnValue('/oscars');
      render(<Navigation />);

      expect(screen.getByText('Oscars')).toBeInTheDocument();
    });

    it('renders on watchlist page', () => {
      mockPathname.mockReturnValue('/watchlist');
      render(<Navigation />);

      expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });
  });

  describe('structure', () => {
    it('renders as a nav element', () => {
      const { container } = render(<Navigation />);

      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('renders navigation container with correct positioning', () => {
      const { container } = render(<Navigation />);
      const nav = container.querySelector('nav');

      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('z-50');
    });
  });
});
