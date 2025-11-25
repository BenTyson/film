import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TMDBSearchInput } from './TMDBSearchInput';

describe('TMDBSearchInput', () => {
  describe('rendering', () => {
    it('renders input with default placeholder', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} />);

      expect(screen.getByPlaceholderText('Search for movies...')).toBeInTheDocument();
    });

    it('renders input with custom placeholder', () => {
      render(
        <TMDBSearchInput
          value=""
          onChange={() => {}}
          placeholder="Find a film..."
        />
      );

      expect(screen.getByPlaceholderText('Find a film...')).toBeInTheDocument();
    });

    it('renders input with current value', () => {
      render(<TMDBSearchInput value="Inception" onChange={() => {}} />);

      expect(screen.getByDisplayValue('Inception')).toBeInTheDocument();
    });

    it('renders as search input type', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('accessibility', () => {
    it('has default aria-label', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} />);

      expect(screen.getByLabelText('Search movies')).toBeInTheDocument();
    });

    it('has custom aria-label when provided', () => {
      render(
        <TMDBSearchInput
          value=""
          onChange={() => {}}
          label="Search TMDB database"
        />
      );

      expect(screen.getByLabelText('Search TMDB database')).toBeInTheDocument();
    });

    it('shows screen reader loading text when loading', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} isLoading />);

      expect(screen.getByText('Loading search results')).toBeInTheDocument();
    });

    it('hides loading text from screen readers when not loading', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} isLoading={false} />);

      expect(screen.queryByText('Loading search results')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      const { container } = render(
        <TMDBSearchInput value="" onChange={() => {}} isLoading />
      );

      // Loader2 icon should have animate-spin class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loading spinner when isLoading is false', () => {
      const { container } = render(
        <TMDBSearchInput value="" onChange={() => {}} isLoading={false} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onChange when input value changes', () => {
      const handleChange = vi.fn();
      render(<TMDBSearchInput value="" onChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Matrix' } });

      expect(handleChange).toHaveBeenCalledWith('Matrix');
    });

    it('calls onChange on each keystroke', () => {
      const handleChange = vi.fn();
      render(<TMDBSearchInput value="" onChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'T' } });
      fireEvent.change(input, { target: { value: 'Th' } });
      fireEvent.change(input, { target: { value: 'The' } });

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('supports autoFocus', () => {
      render(<TMDBSearchInput value="" onChange={() => {}} autoFocus />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveFocus();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TMDBSearchInput value="" onChange={() => {}} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has relative positioning for icon placement', () => {
      const { container } = render(
        <TMDBSearchInput value="" onChange={() => {}} />
      );

      expect(container.firstChild).toHaveClass('relative');
    });
  });
});
