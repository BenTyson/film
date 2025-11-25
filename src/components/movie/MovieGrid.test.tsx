import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovieGrid } from './MovieGrid';
import type { MovieGridItem } from '@/types/movie';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock MovieCard to simplify testing
vi.mock('./MovieCard', () => ({
  MovieCard: ({ movie, context }: { movie: MovieGridItem; context: string }) => (
    <div data-testid={`movie-card-${movie.id}`} data-context={context}>
      {movie.title}
    </div>
  ),
}));

const createMockMovie = (overrides: Partial<MovieGridItem> = {}): MovieGridItem => ({
  id: 1,
  title: 'Test Movie',
  poster_path: '/poster.jpg',
  release_date: '2023-01-15',
  personal_rating: 8,
  ...overrides,
});

describe('MovieGrid', () => {
  describe('loading state', () => {
    it('renders loading skeleton when loading is true', () => {
      const { container } = render(<MovieGrid movies={[]} loading={true} />);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(12);
    });

    it('does not render movies when loading', () => {
      const movies = [createMockMovie({ id: 1, title: 'Movie 1' })];
      render(<MovieGrid movies={movies} loading={true} />);

      expect(screen.queryByTestId('movie-card-1')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no movies', () => {
      render(<MovieGrid movies={[]} />);

      expect(screen.getByText('No movies found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search criteria/)).toBeInTheDocument();
    });

    it('shows movie emoji icon in empty state', () => {
      render(<MovieGrid movies={[]} />);

      expect(screen.getByText('🎬')).toBeInTheDocument();
    });
  });

  describe('rendering movies', () => {
    it('renders all movies', () => {
      const movies = [
        createMockMovie({ id: 1, title: 'Movie 1' }),
        createMockMovie({ id: 2, title: 'Movie 2' }),
        createMockMovie({ id: 3, title: 'Movie 3' }),
      ];

      render(<MovieGrid movies={movies} />);

      expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('movie-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('movie-card-3')).toBeInTheDocument();
    });

    it('displays movie titles', () => {
      const movies = [
        createMockMovie({ id: 1, title: 'Fight Club' }),
        createMockMovie({ id: 2, title: 'The Matrix' }),
      ];

      render(<MovieGrid movies={movies} />);

      expect(screen.getByText('Fight Club')).toBeInTheDocument();
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
    });
  });

  describe('context prop', () => {
    it('passes default context to MovieCard', () => {
      const movies = [createMockMovie({ id: 1 })];
      render(<MovieGrid movies={movies} />);

      expect(screen.getByTestId('movie-card-1')).toHaveAttribute('data-context', 'collection');
    });

    it('passes custom context to MovieCard', () => {
      const movies = [createMockMovie({ id: 1 })];
      render(<MovieGrid movies={movies} context="oscars" />);

      expect(screen.getByTestId('movie-card-1')).toHaveAttribute('data-context', 'oscars');
    });

    it('passes watchlist context', () => {
      const movies = [createMockMovie({ id: 1 })];
      render(<MovieGrid movies={movies} context="watchlist" />);

      expect(screen.getByTestId('movie-card-1')).toHaveAttribute('data-context', 'watchlist');
    });

    it('passes vault context', () => {
      const movies = [createMockMovie({ id: 1 })];
      render(<MovieGrid movies={movies} context="vault" />);

      expect(screen.getByTestId('movie-card-1')).toHaveAttribute('data-context', 'vault');
    });
  });

  describe('column configuration', () => {
    it('applies default 6-column grid class', () => {
      const movies = [createMockMovie({ id: 1 })];
      const { container } = render(<MovieGrid movies={movies} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('xl:grid-cols-6');
    });

    it('applies 4-column grid class', () => {
      const movies = [createMockMovie({ id: 1 })];
      const { container } = render(<MovieGrid movies={movies} columns={4} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('lg:grid-cols-4');
    });

    it('applies 2-column grid class', () => {
      const movies = [createMockMovie({ id: 1 })];
      const { container } = render(<MovieGrid movies={movies} columns={2} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2');
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const movies = [createMockMovie({ id: 1 })];
      const { container } = render(
        <MovieGrid movies={movies} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('preserves default w-full class with custom className', () => {
      const movies = [createMockMovie({ id: 1 })];
      const { container } = render(
        <MovieGrid movies={movies} className="my-4" />
      );

      expect(container.firstChild).toHaveClass('w-full');
      expect(container.firstChild).toHaveClass('my-4');
    });
  });

  describe('large datasets', () => {
    it('handles many movies without issues', () => {
      const movies = Array.from({ length: 100 }, (_, i) =>
        createMockMovie({ id: i + 1, title: `Movie ${i + 1}` })
      );

      render(<MovieGrid movies={movies} />);

      expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('movie-card-50')).toBeInTheDocument();
      expect(screen.getByTestId('movie-card-100')).toBeInTheDocument();
    });
  });
});
