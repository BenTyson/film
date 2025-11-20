'use client';

import { useEffect } from 'react';

interface MovieStructuredDataProps {
  movie: {
    title: string;
    overview: string | null;
    release_date: Date | null;
    director: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    runtime: number | null;
    genres: Array<{ id: number; name: string }> | null;
    vote_average?: number | null;
    imdb_id?: string | null;
    tmdb_id: number;
    user_movies?: Array<{
      personal_rating: number | null;
      date_watched: Date | null;
    }>;
  };
}

export function MovieStructuredData({ movie }: MovieStructuredDataProps) {
  useEffect(() => {
    // Remove any existing script with the same id
    const existingScript = document.getElementById('movie-structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: movie.title,
      description: movie.overview || undefined,
      datePublished: movie.release_date ? new Date(movie.release_date).toISOString().split('T')[0] : undefined,
      director: movie.director ? {
        '@type': 'Person',
        name: movie.director
      } : undefined,
      image: posterUrl || undefined,
      genre: movie.genres?.map(g => g.name) || undefined,
      duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
      aggregateRating: movie.vote_average ? {
        '@type': 'AggregateRating',
        ratingValue: movie.vote_average,
        bestRating: 10,
        worstRating: 0,
      } : undefined,
      sameAs: [
        movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}` : undefined,
        `https://www.themoviedb.org/movie/${movie.tmdb_id}`,
      ].filter(Boolean),
      // Add user review if available
      review: movie.user_movies?.[0]?.personal_rating ? {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: movie.user_movies[0].personal_rating,
          bestRating: 10,
          worstRating: 0,
        },
        datePublished: movie.user_movies[0].date_watched
          ? new Date(movie.user_movies[0].date_watched).toISOString().split('T')[0]
          : undefined,
      } : undefined,
    };

    // Remove undefined values
    const cleanedData = JSON.parse(JSON.stringify(structuredData));

    const script = document.createElement('script');
    script.id = 'movie-structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(cleanedData);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('movie-structured-data');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [movie]);

  return null;
}
