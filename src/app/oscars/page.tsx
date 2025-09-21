'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Award, Trophy, Star, Calendar, TrendingUp, Film, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OscarOverview {
  overview: {
    total_nominations: number;
    total_categories: number;
    total_oscar_movies: number;
    movies_in_collection_with_oscars: number;
    oscar_data_entries: number;
    year_range: {
      start: number;
      end: number;
    };
    collection_coverage: {
      oscar_movies_available: number;
      in_collection: number;
      percentage: string;
    };
  };
  categories: Array<{
    id: number;
    name: string;
    category_group: string;
    nomination_count: number;
  }>;
  decades: Array<{
    decade: string;
    start_year: number;
    end_year: number;
    nomination_count: number;
  }>;
  recent_winners: Array<{
    movie_id: number;
    title: string;
    poster_path: string | null;
    tmdb_id: number;
    year: number;
    category: string;
  }>;
  top_winners: Array<{
    id: number;
    title: string;
    poster_path: string | null;
    tmdb_id: number;
    win_count: number;
  }>;
}

interface OscarNomination {
  id: number;
  ceremony_year: number;
  category: string;
  category_group: string;
  nominee_name: string | null;
  is_winner: boolean;
  movie: {
    id: number;
    title: string;
    tmdb_id: number;
    imdb_id: string;
  } | null;
}

interface MovieWithOscars {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  nominations: OscarNomination[];
  in_collection: boolean;
  watched: boolean;
}

export default function OscarsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<OscarOverview | null>(null);
  const [nominations, setNominations] = useState<OscarNomination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [searchYear, setSearchYear] = useState('');
  const [movieData, setMovieData] = useState<Record<number, MovieWithOscars>>({});

  const categories = [
    { id: 'all', name: 'All Categories', emoji: '🏆' },
    { id: 'Best Picture', name: 'Best Picture', emoji: '🎬' },
    { id: 'Best Director', name: 'Best Director', emoji: '🎥' },
    { id: 'Best Actor', name: 'Best Actor', emoji: '🎭' },
    { id: 'Best Actress', name: 'Best Actress', emoji: '👑' }
  ];

  useEffect(() => {
    fetchOscarData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchYearNominations(selectedYear);
    } else if (selectedDecade) {
      fetchDecadeNominations(selectedDecade);
    } else {
      fetchAllNominations();
    }
  }, [selectedCategory, selectedYear, selectedDecade]);

  // Auto-refresh on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Object.keys(movieData).length > 0) {
        // Only refresh if we have data and page becomes visible
        const moviesToCheck = Object.values(movieData).filter(movie => !movie.in_collection);
        if (moviesToCheck.length > 0) {
          refreshCollectionStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [movieData]);

  const fetchOscarData = async () => {
    try {
      const response = await fetch('/api/oscars/overview');
      const data = await response.json();
      if (data.success) {
        setOverviewData(data.data);
      }
    } catch (error) {
      console.error('Error fetching Oscar overview:', error);
    }
  };

  const fetchAllNominations = async () => {
    setLoading(true);
    try {
      // Fetch recent years for initial display
      const recentYears = [];
      const currentYear = new Date().getFullYear();
      for (let year = 2023; year >= 2014; year--) {
        recentYears.push(year);
      }

      const allNominations: OscarNomination[] = [];
      const movies: Record<number, MovieWithOscars> = {};

      for (const year of recentYears) {
        const url = selectedCategory === 'all'
          ? `/api/oscars/years/${year}`
          : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          const yearNominations = data.data.nominations || data.data;
          allNominations.push(...yearNominations);

          // Process movies for this year
          yearNominations.forEach((nom: OscarNomination) => {
            if (nom.movie) {
              const movieId = nom.movie.tmdb_id;
              if (!movies[movieId]) {
                movies[movieId] = {
                  id: nom.movie.id,
                  tmdb_id: nom.movie.tmdb_id,
                  title: nom.movie.title,
                  poster_path: null,
                  release_date: '',
                  nominations: [],
                  in_collection: false,
                  watched: true // Default to true (not grayed) for movies not in collection
                };
              }
              movies[movieId].nominations.push(nom);
            }
          });
        }
      }

      // Check collection status for movies
      await checkCollectionStatus(Object.values(movies));

      setNominations(allNominations);
      setMovieData(movies);
    } catch (error) {
      console.error('Error fetching nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearNominations = async (year: number) => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? `/api/oscars/years/${year}`
        : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const yearNominations = data.data.nominations || data.data;
        setNominations(yearNominations);

        // Process movies
        const movies: Record<number, MovieWithOscars> = {};
        yearNominations.forEach((nom: OscarNomination) => {
          if (nom.movie) {
            const movieId = nom.movie.tmdb_id;
            if (!movies[movieId]) {
              movies[movieId] = {
                id: nom.movie.id,
                tmdb_id: nom.movie.tmdb_id,
                title: nom.movie.title,
                poster_path: null,
                release_date: '',
                nominations: [],
                in_collection: false,
                watched: true // Default to true (not grayed) for movies not in collection
              };
            }
            movies[movieId].nominations.push(nom);
          }
        });

        await checkCollectionStatus(Object.values(movies));
        setMovieData(movies);
      }
    } catch (error) {
      console.error('Error fetching year nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecadeNominations = async (decade: string) => {
    setLoading(true);
    const startYear = parseInt(decade);
    const endYear = startYear + 9;

    try {
      const allNominations: OscarNomination[] = [];
      const movies: Record<number, MovieWithOscars> = {};

      for (let year = endYear; year >= startYear; year--) {
        const url = selectedCategory === 'all'
          ? `/api/oscars/years/${year}`
          : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          const yearNominations = data.data.nominations || data.data;
          allNominations.push(...yearNominations);

          yearNominations.forEach((nom: OscarNomination) => {
            if (nom.movie) {
              const movieId = nom.movie.tmdb_id;
              if (!movies[movieId]) {
                movies[movieId] = {
                  id: nom.movie.id,
                  tmdb_id: nom.movie.tmdb_id,
                  title: nom.movie.title,
                  poster_path: null,
                  release_date: '',
                  nominations: [],
                  in_collection: false,
                  watched: true // Default to true (not grayed) for movies not in collection
                };
              }
              movies[movieId].nominations.push(nom);
            }
          });
        }
      }

      await checkCollectionStatus(Object.values(movies));
      setNominations(allNominations);
      setMovieData(movies);
    } catch (error) {
      console.error('Error fetching decade nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCollectionStatus = async (movies: MovieWithOscars[]) => {
    // Check if movies are in collection and if they've been watched
    for (const movie of movies) {
      try {
        const response = await fetch(`/api/movies?search=${encodeURIComponent(movie.title)}&limit=5`);
        const data = await response.json();

        if (data.success && data.data.movies.length > 0) {
          // First try exact TMDB ID match
          let collectionMovie = data.data.movies.find((m: any) => m.tmdb_id === movie.tmdb_id);

          // Fallback: try title-based matching if TMDB ID match fails
          if (!collectionMovie) {
            collectionMovie = data.data.movies.find((m: any) =>
              m.title.toLowerCase().trim() === movie.title.toLowerCase().trim()
            );
          }

          if (collectionMovie) {
            movie.in_collection = true;
            movie.watched = true; // All movies in collection are watched
            movie.poster_path = collectionMovie.poster_path;
            movie.release_date = collectionMovie.release_date;
          } else {
            // Movie not in collection - fetch TMDB poster
            movie.watched = false; // Not in collection = not watched
            await fetchTMDBPoster(movie);
          }
        } else {
          // Movie not in collection - fetch TMDB poster
          movie.watched = false; // Not in collection = not watched
          await fetchTMDBPoster(movie);
        }
      } catch (error) {
        console.error('Error checking collection status:', error);
        // If API call fails, try to fetch TMDB poster
        await fetchTMDBPoster(movie);
      }
    }
  };

  const fetchTMDBPoster = async (movie: MovieWithOscars) => {
    try {
      // Use the TMDB API endpoint
      const tmdbResponse = await fetch(`/api/tmdb/movie/${movie.tmdb_id}`);
      if (tmdbResponse.ok) {
        const response = await tmdbResponse.json();
        if (response.success && response.data) {
          if (response.data.poster_path) {
            movie.poster_path = response.data.poster_path;
          }
          if (response.data.release_date) {
            movie.release_date = response.data.release_date;
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching TMDB data for ${movie.title}:`, error);
    }
  };

  const refreshCollectionStatus = async () => {
    setRefreshing(true);
    try {
      // Only refresh movies that are currently marked as not in collection
      const moviesToCheck = Object.values(movieData).filter(movie => !movie.in_collection);
      if (moviesToCheck.length > 0) {
        await checkCollectionStatus(moviesToCheck);
        // Update the movie data state with refreshed status
        setMovieData(prevData => ({ ...prevData }));
      }
    } catch (error) {
      console.error('Error refreshing collection status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleYearSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(searchYear);
    if (year >= 1928 && year <= 2023) {
      setSelectedYear(year);
      setSelectedDecade(null);
    }
  };

  // Group nominations by year
  const nominationsByYear = nominations.reduce((acc, nom) => {
    if (!acc[nom.ceremony_year]) {
      acc[nom.ceremony_year] = [];
    }
    acc[nom.ceremony_year].push(nom);
    return acc;
  }, {} as Record<number, OscarNomination[]>);

  const sortedYears = Object.keys(nominationsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="relative h-[40vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/20 via-yellow-800/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-600/10 via-transparent to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
          <div className="mb-4">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Academy Awards Collection
          </h1>
          {overviewData && (
            <p className="text-xl text-gray-300">
              {overviewData.overview.year_range.start}–{overviewData.overview.year_range.end} • {' '}
              {overviewData.overview.total_categories} Categories • {' '}
              {overviewData.overview.movies_in_collection_with_oscars} Movies in Collection
            </p>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-lg border-b border-yellow-900/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2 justify-center items-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedYear(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-full transition-all",
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold shadow-lg"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.name}
              </button>
            ))}

            {/* Refresh Button */}
            <button
              onClick={refreshCollectionStatus}
              disabled={refreshing}
              className={cn(
                "px-4 py-2 rounded-full transition-all flex items-center gap-2 ml-4",
                refreshing
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
              title="Refresh collection status"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Year/Decade Filter */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Decade Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {overviewData?.decades.map((decade) => (
              <button
                key={decade.decade}
                onClick={() => {
                  setSelectedDecade(decade.decade);
                  setSelectedYear(null);
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm transition-all",
                  selectedDecade === decade.decade
                    ? "bg-yellow-600 text-black font-semibold"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                )}
              >
                {decade.decade}
              </button>
            ))}
          </div>

          {/* Year Search */}
          <form onSubmit={handleYearSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="1928"
                max="2023"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder="Jump to year..."
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Go
            </button>
          </form>
        </div>

        {/* Clear Filters */}
        {(selectedYear || selectedDecade) && (
          <button
            onClick={() => {
              setSelectedYear(null);
              setSelectedDecade(null);
            }}
            className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Filters • Show Recent Years
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            {overviewData && !selectedYear && !selectedDecade && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-500">
                    {overviewData.overview.movies_in_collection_with_oscars}
                  </div>
                  <div className="text-sm text-gray-400">Oscar Movies in Collection</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-500">
                    {overviewData.overview.collection_coverage.percentage}%
                  </div>
                  <div className="text-sm text-gray-400">Collection Coverage</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-500">
                    {overviewData.overview.total_nominations}
                  </div>
                  <div className="text-sm text-gray-400">Total Nominations</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-500">
                    {overviewData.overview.year_range.end - overviewData.overview.year_range.start + 1}
                  </div>
                  <div className="text-sm text-gray-400">Years of History</div>
                </div>
              </div>
            )}

            {/* Nominations by Year */}
            {sortedYears.map((year) => {
              const yearNoms = nominationsByYear[year];
              if (!yearNoms) return null;

              const yearMovies = new Map<number, MovieWithOscars>();

              // Group by movie
              yearNoms.forEach(nom => {
                if (nom.movie) {
                  const tmdbId = nom.movie.tmdb_id;
                  if (!yearMovies.has(tmdbId)) {
                    yearMovies.set(tmdbId, movieData[tmdbId] || {
                      id: nom.movie.id,
                      tmdb_id: tmdbId,
                      title: nom.movie.title,
                      poster_path: null,
                      release_date: '',
                      nominations: [],
                      in_collection: false,
                      watched: true // Default to true (not grayed) for movies not in collection
                    });
                  }
                }
              });

              const winners = yearNoms.filter(n => n.is_winner);

              return (
                <div key={year} className="border border-gray-800 rounded-xl overflow-hidden">
                  {/* Year Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900">
                    <span className="text-2xl font-bold text-yellow-500">{year}</span>
                  </div>

                  {/* Year Content */}
                  <div className="p-6 bg-gray-900/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from(yearMovies.values()).map((movie) => {
                              const wins = movie.nominations.filter(n => n.is_winner);
                              const isWinner = wins.length > 0;
                              const posterUrl = movie.poster_path
                                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                                : '/placeholder-movie.jpg';

                              return (
                                <Link
                                  key={movie.tmdb_id}
                                  href={`/movies/${movie.id}`}
                                  className="group relative"
                                >
                                  <div
                                    className={cn(
                                      "relative rounded-lg overflow-hidden transition-all duration-300",
                                      isWinner ? "ring-2 ring-yellow-500" : "ring-1 ring-gray-700",
                                      "hover:ring-2 hover:ring-yellow-400 hover:scale-105"
                                    )}
                                  >
                                    {/* Poster */}
                                    <div className="aspect-[2/3] relative">
                                      <Image
                                        src={posterUrl}
                                        alt={movie.title}
                                        fill
                                        className={cn(
                                          "object-cover",
                                          !movie.in_collection && "grayscale opacity-70"
                                        )}
                                      />


                                      {/* Oscar Badges */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {wins.length > 0 && (
                                          <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                                            🏆 {wins.length}
                                          </div>
                                        )}
                                        {movie.nominations.length > wins.length && (
                                          <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                                            {movie.nominations.length - wins.length}
                                          </div>
                                        )}
                                      </div>

                                    </div>

                                    {/* Title */}
                                    <div className="p-2 bg-gray-800">
                                      <h3 className="text-sm font-medium text-white truncate">
                                        {movie.title}
                                      </h3>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {movie.nominations.map(n => n.category).join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}