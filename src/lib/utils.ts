import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatYear(date: Date | string | null): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getFullYear().toString();
}

export function formatRating(rating: number | null): string {
  if (!rating) return '';
  return `${rating}/10`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function extractColorFromImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('#1a1a1a');
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let r = 0, g = 0, b = 0, total = 0;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        total++;
      }

      r = Math.floor(r / total);
      g = Math.floor(g / total);
      b = Math.floor(b / total);

      // Darken the color for better contrast
      r = Math.floor(r * 0.3);
      g = Math.floor(g * 0.3);
      b = Math.floor(b * 0.3);

      resolve(`rgb(${r}, ${g}, ${b})`);
    };

    img.onerror = () => resolve('#1a1a1a');
    img.src = imageSrc;
  });
}

export function getRatingColor(rating: number): string {
  if (rating >= 8) return 'text-green-400';
  if (rating >= 6) return 'text-purple-400';
  if (rating >= 4) return 'text-orange-400';
  return 'text-red-400';
}

export function getOscarBadgeColor(type: 'nominated' | 'won'): string {
  return type === 'won' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-400';
}

export function sortMovies<T extends {
  title?: string;
  release_date?: Date | null;
  date_watched?: Date | null;
  personal_rating?: number | null;
  imdb_rating?: number | null;
}>(
  movies: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
  return movies.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'release_date':
        const aDate = a.release_date ? new Date(a.release_date).getTime() : 0;
        const bDate = b.release_date ? new Date(b.release_date).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case 'date_watched':
        const aWatched = a.date_watched ? new Date(a.date_watched).getTime() : 0;
        const bWatched = b.date_watched ? new Date(b.date_watched).getTime() : 0;
        comparison = aWatched - bWatched;
        break;
      case 'personal_rating':
        comparison = (a.personal_rating || 0) - (b.personal_rating || 0);
        break;
      case 'imdb_rating':
        comparison = (a.imdb_rating || 0) - (b.imdb_rating || 0);
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}