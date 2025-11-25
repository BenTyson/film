import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4', 'py-2');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', false && 'hidden-class', true && 'visible-class');
      expect(result).toContain('base-class');
      expect(result).toContain('visible-class');
      expect(result).not.toContain('hidden-class');
    });

    it('should override conflicting Tailwind classes', () => {
      const result = cn('px-4', 'px-8');
      // Tailwind merge should keep only px-8
      expect(result).toBe('px-8');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'extra');
      expect(result).toContain('base');
      expect(result).toContain('extra');
    });
  });
});
