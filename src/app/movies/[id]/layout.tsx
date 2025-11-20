import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const movieId = parseInt(resolvedParams.id);

  try {
    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    // Fetch movie data for metadata
    const response = await fetch(`${baseUrl}/api/movies/${movieId}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        title: 'Movie Not Found | Film Collection',
        description: 'The requested movie could not be found in the collection.',
      };
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return {
        title: 'Movie Not Found | Film Collection',
        description: 'The requested movie could not be found in the collection.',
      };
    }

    const movie = data.data;
    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;
    const backdropUrl = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : null;

    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const title = `${movie.title}${releaseYear ? ` (${releaseYear})` : ''} | Film Collection`;

    // Create a rich description
    let description = movie.overview || `Watch details and information for ${movie.title}`;
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    // Add director to description if available
    if (movie.director) {
      description = `Directed by ${movie.director}. ${description}`;
    }

    // Determine the best image for social sharing (prefer backdrop, fallback to poster)
    const ogImage = backdropUrl || posterUrl;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: ogImage ? [
          {
            url: ogImage,
            width: backdropUrl ? 1280 : 500,
            height: backdropUrl ? 720 : 750,
            alt: movie.title,
          }
        ] : [],
        type: 'video.movie',
        siteName: 'Film Collection',
        url: `${baseUrl}/movies/${movieId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
      alternates: {
        canonical: `${baseUrl}/movies/${movieId}`,
      },
      // Add structured data for rich snippets
      other: {
        'article:published_time': movie.created_at || '',
        'article:modified_time': movie.updated_at || '',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Movie Details | Film Collection',
      description: 'View movie details and personal tracking information.',
    };
  }
}

export default function MovieLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
