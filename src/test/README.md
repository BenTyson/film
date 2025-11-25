# Testing Utilities

This directory contains test utilities and helpers for the Film project.

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Utilities

### Component Testing

Use `test-utils.tsx` for rendering components in tests:

```typescript
import { render, screen } from '@/test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### API Route Testing

Use `api-test-utils.ts` for testing API routes:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockRequest, parseResponse, mockUser } from '@/test/api-test-utils';
import { GET } from './route';

describe('GET /api/example', () => {
  it('returns data successfully', async () => {
    const request = createMockRequest({
      method: 'GET',
      searchParams: { id: '1' },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Database Mocking

Use `prisma-mock.ts` for mocking Prisma operations:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock, mockMovie } from '@/test/prisma-mock';

// Mock the Prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('Movie operations', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it('finds a movie by id', async () => {
    prismaMock.movies.findUnique.mockResolvedValue(mockMovie);

    const movie = await prisma.movies.findUnique({ where: { id: 1 } });
    expect(movie).toEqual(mockMovie);
  });
});
```

## Test Organization

- Place test files next to the code they test: `component.tsx` → `component.test.tsx`
- Use descriptive test names: `it('should return 404 when movie not found')`
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup

## Coverage Goals

- API routes: 80%+ integration test coverage
- Custom hooks: 90%+ unit test coverage
- Shared components: 70%+ component test coverage
- Utilities: 90%+ unit test coverage

## Mocked Modules

The following modules are automatically mocked in `vitest.setup.ts`:

- `next/navigation` - Router hooks
- `@clerk/nextjs` - Authentication
- Environment variables

## Writing Good Tests

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code under test
3. **Assert**: Verify the results

```typescript
it('creates a new movie', async () => {
  // Arrange
  const newMovie = { tmdb_id: 12345, title: 'New Movie' };
  prismaMock.movies.create.mockResolvedValue({ ...mockMovie, ...newMovie });

  // Act
  const result = await createMovie(newMovie);

  // Assert
  expect(result.title).toBe('New Movie');
  expect(prismaMock.movies.create).toHaveBeenCalledWith({
    data: expect.objectContaining(newMovie),
  });
});
```
