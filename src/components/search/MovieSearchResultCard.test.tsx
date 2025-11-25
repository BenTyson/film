import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieSearchResultCard } from './MovieSearchResultCard';
import type { TMDBEnhancedSearchResult } from '@/types/tmdb';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

const createMockMovie = (overrides: Partial<TMDBEnhancedSearchResult> = {}): TMDBEnhancedSearchResult => ({
  id: 550,
  title: 'Fight Club',
  adult: false,
  original_language: 'en',
  original_title: 'Fight Club',
  popularity: 100,
  video: false,
  vote_count: 1000,
  vote_average: 8.4,
  release_date: '1999-10-15',
  poster_path: '/poster.jpg',
  overview: 'A great movie about fight club.',
  director: 'David Fincher',
  ...overrides,
});

describe('MovieSearchResultCard', () => {
  describe('rendering', () => {
    it('renders movie title', () => {
      const movie = createMockMovie({ title: 'The Matrix' });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
    });

    it('renders release year from release_date', () => {
      const movie = createMockMovie({ release_date: '1999-10-15' });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('1999')).toBeInTheDocument();
    });

    it('renders director when provided', () => {
      const movie = createMockMovie({ director: 'Christopher Nolan' });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();
    });

    it('renders vote average when greater than 0', () => {
      const movie = createMockMovie({ vote_average: 8.4 });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('8.4')).toBeInTheDocument();
    });

    it('does not render vote average when 0', () => {
      const movie = createMockMovie({ vote_average: 0 });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });

    it('renders overview when provided', () => {
      const movie = createMockMovie({ overview: 'An exciting adventure story.' });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('An exciting adventure story.')).toBeInTheDocument();
    });

    it('does not render overview when not provided', () => {
      const movie = createMockMovie({ overview: undefined });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      // Should only have title and metadata, no paragraph with overview
      expect(screen.queryByText(/great movie/)).not.toBeInTheDocument();
    });
  });

  describe('poster image', () => {
    it('renders poster image with correct alt text', () => {
      const movie = createMockMovie({ title: 'Inception', poster_path: '/inception.jpg' });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      const img = screen.getByAltText('Inception');
      expect(img).toBeInTheDocument();
    });

    it('uses placeholder when poster_path is null', () => {
      const movie = createMockMovie({ poster_path: null });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      const img = screen.getByAltText('Fight Club');
      expect(img).toHaveAttribute('src', '/placeholder-poster.svg');
    });
  });

  describe('click handling', () => {
    it('calls onSelect with movie when clicked', () => {
      const movie = createMockMovie();
      const onSelect = vi.fn();
      render(<MovieSearchResultCard movie={movie} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Fight Club').closest('div')!.parentElement!.parentElement!);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(movie);
    });

    it('does not call onSelect when loading', () => {
      const movie = createMockMovie();
      const onSelect = vi.fn();
      render(<MovieSearchResultCard movie={movie} onSelect={onSelect} isLoading={true} />);

      fireEvent.click(screen.getByText('Fight Club').closest('div')!.parentElement!.parentElement!);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows spinner when loading', () => {
      const movie = createMockMovie();
      const { container } = render(
        <MovieSearchResultCard movie={movie} onSelect={() => {}} isLoading={true} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show default plus icon when loading', () => {
      const movie = createMockMovie();
      const { container } = render(
        <MovieSearchResultCard movie={movie} onSelect={() => {}} isLoading={true} />
      );

      // Should have spinner, not plus icon
      const spinnerIcon = container.querySelector('.animate-spin');
      expect(spinnerIcon).toBeInTheDocument();
    });
  });

  describe('custom action icon', () => {
    it('renders custom action icon instead of default plus', () => {
      const movie = createMockMovie();
      const customIcon = <span data-testid="custom-icon">Custom</span>;
      render(
        <MovieSearchResultCard
          movie={movie}
          onSelect={() => {}}
          actionIcon={customIcon}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('shows spinner over custom icon when loading', () => {
      const movie = createMockMovie();
      const customIcon = <span data-testid="custom-icon">Custom</span>;
      const { container } = render(
        <MovieSearchResultCard
          movie={movie}
          onSelect={() => {}}
          actionIcon={customIcon}
          isLoading={true}
        />
      );

      expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('optional fields', () => {
    it('handles missing release_date gracefully', () => {
      const movie = createMockMovie({ release_date: undefined });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      // Should render without year
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
      expect(screen.queryByText('1999')).not.toBeInTheDocument();
    });

    it('handles missing director gracefully', () => {
      const movie = createMockMovie({ director: undefined });
      render(<MovieSearchResultCard movie={movie} onSelect={() => {}} />);

      expect(screen.getByText('Fight Club')).toBeInTheDocument();
      expect(screen.queryByText('David Fincher')).not.toBeInTheDocument();
    });

    it('renders minimal movie with only required fields', () => {
      const minimalMovie: TMDBEnhancedSearchResult = {
        id: 1,
        title: 'Minimal Movie',
        adult: false,
        original_language: 'en',
        original_title: 'Minimal Movie',
        popularity: 0,
        video: false,
        vote_count: 0,
        vote_average: 0,
      };

      render(<MovieSearchResultCard movie={minimalMovie} onSelect={() => {}} />);

      expect(screen.getByText('Minimal Movie')).toBeInTheDocument();
    });
  });
});
