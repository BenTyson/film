import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieCard } from './MovieCard';
import type { MovieGridItem } from '@/types/movie';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div onClick={onClick} className={className} data-testid="movie-card">
        {children}
      </div>
    ),
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="movie-poster" />
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="movie-link">{children}</a>
  ),
}));

// Mock useUserRole
const mockUseUserRole = vi.fn();
vi.mock('@/contexts', () => ({
  useUserRole: () => mockUseUserRole(),
}));

const createMockMovie = (overrides: Partial<MovieGridItem> = {}): MovieGridItem => ({
  id: 1,
  title: 'Test Movie',
  release_date: '2023-06-15',
  director: 'Test Director',
  poster_path: '/test-poster.jpg',
  personal_rating: 8.5,
  is_favorite: false,
  date_watched: null,
  oscar_badges: {
    wins: 0,
    nominations: 0,
  },
  tags: [],
  backdrop_path: null,
  ...overrides,
});

describe('MovieCard', () => {
  beforeEach(() => {
    mockUseUserRole.mockReturnValue({ isAdmin: false });
  });

  describe('rendering', () => {
    it('renders movie title', () => {
      const movie = createMockMovie({ title: 'Inception' });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('Inception')).toBeInTheDocument();
    });

    it('renders year and director', () => {
      const movie = createMockMovie({
        release_date: '2010-07-16',
        director: 'Christopher Nolan',
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('2010 | Christopher Nolan')).toBeInTheDocument();
    });

    it('renders only year when director is missing', () => {
      const movie = createMockMovie({
        release_date: '2010-07-16',
        director: null,
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('2010')).toBeInTheDocument();
    });

    it('renders movie poster with correct src', () => {
      const movie = createMockMovie({ poster_path: '/my-poster.jpg' });
      render(<MovieCard movie={movie} />);

      const poster = screen.getByTestId('movie-poster');
      expect(poster).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/my-poster.jpg');
    });

    it('renders placeholder when no poster path', () => {
      const movie = createMockMovie({ poster_path: null });
      render(<MovieCard movie={movie} />);

      const poster = screen.getByTestId('movie-poster');
      expect(poster).toHaveAttribute('src', '/placeholder-poster.svg');
    });

    it('renders personal rating when provided', () => {
      const movie = createMockMovie({ personal_rating: 9 });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('9')).toBeInTheDocument();
    });
  });

  describe('oscar badges', () => {
    it('shows win badge when movie has oscar wins', () => {
      const movie = createMockMovie({
        oscar_badges: { wins: 3, nominations: 5 },
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows nomination badge for nominations without wins', () => {
      const movie = createMockMovie({
        oscar_badges: { wins: 2, nominations: 5 },
      });
      render(<MovieCard movie={movie} />);

      // Should show 3 (5 nominations - 2 wins = 3 nomination-only badges)
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not show badges when no oscar recognition', () => {
      const movie = createMockMovie({
        oscar_badges: { wins: 0, nominations: 0 },
      });
      render(<MovieCard movie={movie} />);

      // Badge container should not exist or be empty
      const badges = screen.queryAllByText(/^\d+$/);
      // Only personal rating should show as a number
      expect(badges.length).toBeLessThanOrEqual(1);
    });
  });

  describe('favorite indicator', () => {
    it('shows heart icon when movie is favorite', () => {
      const movie = createMockMovie({ is_favorite: true });
      const { container } = render(<MovieCard movie={movie} />);

      // Check for the heart icon (lucide renders as SVG)
      const heart = container.querySelector('.text-red-500');
      expect(heart).toBeInTheDocument();
    });

    it('does not show heart icon when movie is not favorite', () => {
      const movie = createMockMovie({ is_favorite: false });
      const { container } = render(<MovieCard movie={movie} />);

      // Heart should not be present
      const heart = container.querySelector('.text-red-500.fill-current');
      expect(heart).not.toBeInTheDocument();
    });
  });

  describe('tags', () => {
    it('renders tags', () => {
      const movie = createMockMovie({
        tags: [
          { name: 'Action', color: '#ff0000', icon: 'User' },
          { name: 'Sci-Fi', color: '#00ff00', icon: 'Users' },
        ],
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    });

    it('shows +N badge when more than 3 tags', () => {
      const movie = createMockMovie({
        tags: [
          { name: 'Tag1', color: '#ff0000', icon: 'User' },
          { name: 'Tag2', color: '#00ff00', icon: 'User' },
          { name: 'Tag3', color: '#0000ff', icon: 'User' },
          { name: 'Tag4', color: '#ffff00', icon: 'User' },
          { name: 'Tag5', color: '#ff00ff', icon: 'User' },
        ],
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('filters Calen tag for non-admin users', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: false });

      const movie = createMockMovie({
        tags: [
          { name: 'Calen', color: '#ff0000', icon: 'User' },
          { name: 'Action', color: '#00ff00', icon: 'User' },
        ],
      });
      render(<MovieCard movie={movie} />);

      expect(screen.queryByText('Calen')).not.toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('shows Calen tag for admin users', () => {
      mockUseUserRole.mockReturnValue({ isAdmin: true });

      const movie = createMockMovie({
        tags: [
          { name: 'Calen', color: '#ff0000', icon: 'User' },
          { name: 'Action', color: '#00ff00', icon: 'User' },
        ],
      });
      render(<MovieCard movie={movie} />);

      expect(screen.getByText('Calen')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onSelect when clicked and onSelect is provided', () => {
      const handleSelect = vi.fn();
      const movie = createMockMovie();
      render(<MovieCard movie={movie} onSelect={handleSelect} />);

      fireEvent.click(screen.getByTestId('movie-card'));

      expect(handleSelect).toHaveBeenCalledWith(movie);
    });

    it('renders as link when onSelect is not provided', () => {
      const movie = createMockMovie({ id: 42 });
      render(<MovieCard movie={movie} />);

      const link = screen.getByTestId('movie-link');
      expect(link).toHaveAttribute('href', '/movies/42?from=collection');
    });

    it('includes correct context in link URL', () => {
      const movie = createMockMovie({ id: 42 });
      render(<MovieCard movie={movie} context="watchlist" />);

      const link = screen.getByTestId('movie-link');
      expect(link).toHaveAttribute('href', '/movies/42?from=watchlist');
    });
  });

  describe('edge cases', () => {
    it('handles movie with minimal data', () => {
      const movie = createMockMovie({
        title: 'Minimal Movie',
        release_date: null,
        director: null,
        poster_path: null,
        personal_rating: null,
        tags: [],
        oscar_badges: { wins: 0, nominations: 0 },
      });

      expect(() => render(<MovieCard movie={movie} />)).not.toThrow();
      expect(screen.getByText('Minimal Movie')).toBeInTheDocument();
    });
  });
});
