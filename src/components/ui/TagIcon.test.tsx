import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TagIcon } from './TagIcon';

describe('TagIcon', () => {
  describe('rendering known icons', () => {
    it('renders user icon', () => {
      const { container } = render(<TagIcon iconName="user" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders sword icon', () => {
      const { container } = render(<TagIcon iconName="sword" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders ghost icon', () => {
      const { container } = render(<TagIcon iconName="ghost" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders palette icon', () => {
      const { container } = render(<TagIcon iconName="palette" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase icon names', () => {
      const { container } = render(<TagIcon iconName="USER" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('handles mixed case icon names', () => {
      const { container } = render(<TagIcon iconName="Ghost" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('null/unknown handling', () => {
    it('returns null for null iconName', () => {
      const { container } = render(<TagIcon iconName={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null for unknown icon name', () => {
      const { container } = render(<TagIcon iconName="unknown-icon" />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null for empty string', () => {
      const { container } = render(<TagIcon iconName="" />);

      // Empty string is falsy but not null, so it goes through iconMap lookup
      expect(container.firstChild).toBeNull();
    });
  });

  describe('styling', () => {
    it('applies default className', () => {
      const { container } = render(<TagIcon iconName="user" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(
        <TagIcon iconName="user" className="w-6 h-6 text-red-500" />
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6', 'text-red-500');
    });
  });
});
