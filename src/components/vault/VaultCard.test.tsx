import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultCard } from './VaultCard';
import type { VaultWithCount } from '@/types/vault';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, onKeyDown, tabIndex, role, 'aria-label': ariaLabel, className }: React.HTMLAttributes<HTMLDivElement> & { 'aria-label'?: string }) => (
      <div
        onClick={onClick}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        role={role}
        aria-label={ariaLabel}
        className={className}
        data-testid="vault-card"
      >
        {children}
      </div>
    ),
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="poster-image" />
  ),
}));

const createMockVault = (overrides: Partial<VaultWithCount> = {}): VaultWithCount => ({
  id: 1,
  name: 'Test Vault',
  description: 'A test vault description',
  user_id: 1,
  created_at: new Date(),
  updated_at: new Date(),
  movie_count: 5,
  preview_posters: ['/poster1.jpg', '/poster2.jpg'],
  ...overrides,
});

describe('VaultCard', () => {
  describe('rendering', () => {
    it('renders vault name', () => {
      const vault = createMockVault({ name: 'My Movie Collection' });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('My Movie Collection')).toBeInTheDocument();
    });

    it('renders movie count with correct plural form', () => {
      const vault = createMockVault({ movie_count: 5 });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('5 films')).toBeInTheDocument();
    });

    it('renders movie count with correct singular form', () => {
      const vault = createMockVault({ movie_count: 1 });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('1 film')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      const vault = createMockVault({ description: 'My favorite action movies' });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('My favorite action movies')).toBeInTheDocument();
    });

    it('renders "No description" when description is null', () => {
      const vault = createMockVault({ description: null });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('renders preview poster images when available', () => {
      const vault = createMockVault({
        preview_posters: ['/poster1.jpg', '/poster2.jpg', '/poster3.jpg']
      });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      const images = screen.getAllByTestId('poster-image');
      expect(images).toHaveLength(3);
    });

    it('limits preview posters to 4', () => {
      const vault = createMockVault({
        preview_posters: ['/p1.jpg', '/p2.jpg', '/p3.jpg', '/p4.jpg', '/p5.jpg', '/p6.jpg']
      });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      const images = screen.getAllByTestId('poster-image');
      expect(images).toHaveLength(4);
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label with plural films', () => {
      const vault = createMockVault({ name: 'Action Movies', movie_count: 10 });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Open Action Movies vault with 10 films'
      );
    });

    it('has correct aria-label with singular film', () => {
      const vault = createMockVault({ name: 'Single Movie', movie_count: 1 });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Open Single Movie vault with 1 film'
      );
    });

    it('has tabIndex for keyboard navigation', () => {
      const vault = createMockVault();
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      const vault = createMockVault();
      render(<VaultCard vault={vault} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('vault-card'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter key is pressed', () => {
      const handleClick = vi.fn();
      const vault = createMockVault();
      render(<VaultCard vault={vault} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('vault-card'), { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed', () => {
      const handleClick = vi.fn();
      const vault = createMockVault();
      render(<VaultCard vault={vault} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('vault-card'), { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick for other keys', () => {
      const handleClick = vi.fn();
      const vault = createMockVault();
      render(<VaultCard vault={vault} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('vault-card'), { key: 'Tab' });
      fireEvent.keyDown(screen.getByTestId('vault-card'), { key: 'Escape' });

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles zero movie count', () => {
      const vault = createMockVault({ movie_count: 0, preview_posters: [] });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      expect(screen.getByText('0 films')).toBeInTheDocument();
    });

    it('handles empty preview posters array', () => {
      const vault = createMockVault({ preview_posters: [] });
      render(<VaultCard vault={vault} onClick={() => {}} />);

      // Should not find any poster images
      expect(screen.queryAllByTestId('poster-image')).toHaveLength(0);
    });
  });
});
