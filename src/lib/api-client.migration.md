# API Client Migration Guide

This guide shows how to migrate from manual `fetch()` calls to the new centralized `APIClient`.

## Benefits of Migration

✅ **Type Safety**: Full TypeScript support with autocomplete
✅ **Consistent Error Handling**: Automatic error handling with toast notifications
✅ **Less Boilerplate**: No more repetitive try-catch blocks
✅ **Better UX**: Automatic loading states and user feedback
✅ **Centralized**: Single source of truth for API configuration
✅ **Testable**: Easy to mock in tests

---

## Migration Examples

### Example 1: Simple GET Request

**Before:**
```typescript
const fetchMovies = async () => {
  try {
    const response = await fetch('/api/movies');
    const data = await response.json();

    if (data.success) {
      setMovies(data.data);
    } else {
      alert(`Failed: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch movies');
  }
};
```

**After:**
```typescript
import { api } from '@/lib/api-client';

const fetchMovies = async () => {
  try {
    const movies = await api.movies.getAll();
    setMovies(movies);
  } catch (error) {
    // Error toast already shown automatically
    // Just handle UI state
  }
};
```

**Savings:** 8 lines → 5 lines (37% reduction)

---

### Example 2: POST with Query Parameters

**Before:**
```typescript
const searchMovies = async (query: string) => {
  setLoading(true);
  try {
    const response = await fetch('/api/tmdb/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        enhanced: true,
      }),
    });
    const data = await response.json();

    if (data.success) {
      setSearchResults(data.results || []);
    } else {
      console.error('TMDB search error:', data.error);
      setSearchResults([]);
    }
  } catch (error) {
    console.error('Error searching TMDB:', error);
    setSearchResults([]);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
import { api } from '@/lib/api-client';

const searchMovies = async (query: string) => {
  setLoading(true);
  try {
    const results = await api.tmdb.search(query, true);
    setSearchResults(results || []);
  } catch (error) {
    setSearchResults([]);
  } finally {
    setLoading(false);
  }
};
```

**Savings:** 23 lines → 9 lines (60% reduction)

---

### Example 3: DELETE with Success Toast

**Before:**
```typescript
const handleDelete = async (movieId: number) => {
  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (data.success) {
      alert('Movie deleted successfully');
      onMovieDeleted();
    } else {
      alert(`Failed to delete: ${data.error}`);
    }
  } catch (error) {
    console.error('Error deleting movie:', error);
    alert('Failed to delete movie');
  }
};
```

**After:**
```typescript
import { api } from '@/lib/api-client';

const handleDelete = async (movieId: number) => {
  try {
    await api.movies.delete(movieId);
    // Success toast shown automatically!
    onMovieDeleted();
  } catch (error) {
    // Error toast shown automatically
  }
};
```

**Savings:** 15 lines → 6 lines (60% reduction) + Better UX (toast vs alert)

---

### Example 4: Custom Error Handling

**Before:**
```typescript
const addToWatchlist = async (movie: any) => {
  setAddingMovie(movie.id);
  try {
    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tmdb_id: movie.id,
        title: movie.title,
        // ... more fields
      }),
    });

    const data = await response.json();

    if (data.success) {
      onMovieAdded();
      onClose();
    } else {
      alert(`Failed to add movie: ${data.error}`);
    }
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    alert('Failed to add movie to watchlist');
  } finally {
    setAddingMovie(null);
  }
};
```

**After:**
```typescript
import { api } from '@/lib/api-client';

const addToWatchlist = async (movie: TMDBEnhancedSearchResult) => {
  setAddingMovie(movie.id);
  try {
    await api.watchlist.create({
      tmdb_id: movie.id,
      title: movie.title,
      // ... more fields
    });
    // Success toast shown automatically!
    onMovieAdded();
    onClose();
  } catch (error) {
    // Error toast shown automatically
  } finally {
    setAddingMovie(null);
  }
};
```

**Savings:** 24 lines → 13 lines (45% reduction) + Type safety

---

### Example 5: Using Generic APIClient for Custom Endpoints

**Before:**
```typescript
const fetchCustomData = async () => {
  try {
    const response = await fetch('/api/custom/endpoint?filter=active&page=1');
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

**After:**
```typescript
import { apiClient } from '@/lib/api-client';

const fetchCustomData = async () => {
  return apiClient.get('/api/custom/endpoint', {
    filter: 'active',
    page: 1,
  });
};
```

**Savings:** 13 lines → 5 lines (61% reduction)

---

### Example 6: Disable Toast Notifications

For cases where you don't want automatic toasts (e.g., background polling):

```typescript
import { apiClient } from '@/lib/api-client';

const pollForUpdates = async () => {
  try {
    const updates = await apiClient.get('/api/updates', undefined, {
      showErrorToast: false, // Don't show error toast for polling
    });
    handleUpdates(updates);
  } catch (error) {
    // Silently handle or log
  }
};
```

---

### Example 7: Custom Success Messages

```typescript
import { api } from '@/lib/api-client';

const createVault = async (name: string) => {
  await api.vaults.create({ name });
  // Shows: "Vault created successfully" (predefined)
};

// Or with custom message:
import { apiClient } from '@/lib/api-client';

const createSpecialVault = async (name: string) => {
  await apiClient.post('/api/vaults', { name }, {
    showSuccessToast: true,
    successMessage: `"${name}" vault created! 🎉`,
  });
};
```

---

## Migration Checklist

For each component using `fetch()`:

- [ ] Import `api` or `apiClient` from `@/lib/api-client`
- [ ] Replace `fetch()` call with appropriate method
- [ ] Remove manual error handling (try-catch still needed for UI state)
- [ ] Remove manual `alert()` calls (use toast automatically)
- [ ] Remove manual `JSON.stringify()` and `JSON.parse()`
- [ ] Update types to use proper TypeScript interfaces
- [ ] Test the component thoroughly
- [ ] Remove old `console.error` statements if no longer needed

---

## Testing with API Client

```typescript
import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';

// Mock the api client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  api: {
    movies: {
      getAll: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('MyComponent', () => {
  it('fetches movies on mount', async () => {
    const { api } = await import('@/lib/api-client');
    (api.movies.getAll as any).mockResolvedValue([{ id: 1, title: 'Test' }]);

    render(<MyComponent />);

    await waitFor(() => {
      expect(api.movies.getAll).toHaveBeenCalled();
    });
  });
});
```

---

## Common Patterns

### Pattern 1: Loading State
```typescript
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    const data = await api.movies.getAll();
    setMovies(data);
  } catch (error) {
    // Error already handled with toast
  } finally {
    setLoading(false);
  }
};
```

### Pattern 2: Optimistic Updates
```typescript
const deleteMovie = async (id: number) => {
  // Optimistically remove from UI
  setMovies(prev => prev.filter(m => m.id !== id));

  try {
    await api.movies.delete(id);
  } catch (error) {
    // Revert on error
    loadMovies();
  }
};
```

### Pattern 3: Batch Operations
```typescript
const importMovies = async (movies: Movie[]) => {
  const results = await Promise.allSettled(
    movies.map(movie => api.movies.create(movie))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  toast.success(`Imported ${succeeded} movies`);
  if (failed > 0) {
    toast.error(`${failed} movies failed to import`);
  }
};
```

---

## Priority Files to Migrate

High impact files (most fetch calls):

1. `src/components/vault/AddToVaultModal.tsx` - 3+ fetch calls
2. `src/components/watchlist/AddToWatchlistModal.tsx` - 3+ fetch calls
3. `src/components/movie/MovieDetailsModal.tsx` - 5+ fetch calls
4. `src/app/page.tsx` (HomePage) - Multiple fetch calls
5. `src/app/import/page.tsx` - Complex fetch patterns

Medium priority:

6. `src/components/watchlist/WatchlistMovieModal.tsx`
7. `src/components/vault/VaultMovieModal.tsx`
8. `src/app/vaults/[id]/page.tsx`

---

## Need Help?

- Check the API client source: `src/lib/api-client.ts`
- See test examples: `src/lib/api-client.test.ts`
- Review constants: `src/lib/constants/index.ts`
