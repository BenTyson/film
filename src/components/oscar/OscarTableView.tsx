'use client';

import { useEffect, useState, useMemo } from 'react';
import { OscarTableMovie } from '@/types/api';
import { ArrowUp, ArrowDown, AlertCircle, CheckCircle2, X } from 'lucide-react';

type SortColumn = 'title' | 'tmdb_id' | 'ceremony_years' | 'win_count' | 'nomination_count';
type SortDirection = 'asc' | 'desc';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

export default function OscarTableView() {
  const [movies, setMovies] = useState<OscarTableMovie[]>([]);
  const [sortedMovies, setSortedMovies] = useState<OscarTableMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>({
    column: 'ceremony_years',
    direction: 'desc'
  });

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch data
  useEffect(() => {
    async function fetchTableData() {
      try {
        setLoading(true);
        const response = await fetch('/api/oscars/table');
        const result = await response.json();

        if (result.success) {
          setMovies(result.data.movies);
          setSortedMovies(result.data.movies);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        setError('Failed to fetch Oscar table data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTableData();
  }, []);

  // Get unique years and categories from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    movies.forEach(movie => {
      movie.ceremony_years.forEach(year => years.add(year));
    });
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [movies]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    movies.forEach(movie => {
      movie.nominations.forEach(nom => categories.add(nom.category));
    });
    // Sort with major categories first
    const majorCategories = ['Best Picture', 'Best Director', 'Best Actor', 'Best Actress'];
    const allCategories = Array.from(categories).sort();
    const sorted = [
      ...majorCategories.filter(cat => allCategories.includes(cat)),
      ...allCategories.filter(cat => !majorCategories.includes(cat))
    ];
    return sorted;
  }, [movies]);

  // Filter movies based on selected filters
  const filteredMovies = useMemo(() => {
    let filtered = [...movies];

    // Year filter
    if (selectedYear !== null) {
      filtered = filtered.filter(movie =>
        movie.ceremony_years.includes(selectedYear)
      );
    }

    // Category filter (AND logic - movie must have at least one nomination in selected categories)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(movie =>
        movie.nominations.some(nom => selectedCategories.includes(nom.category))
      );
    }

    return filtered;
  }, [movies, selectedYear, selectedCategories]);

  // Sort filtered movies when sort state or filters change
  useEffect(() => {
    const sorted = [...filteredMovies].sort((a, b) => {
      let comparison = 0;

      switch (sortState.column) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'tmdb_id':
          comparison = (a.tmdb_id || 0) - (b.tmdb_id || 0);
          break;
        case 'ceremony_years':
          // Sort by most recent year for each movie
          const aMax = a.ceremony_years.length > 0 ? Math.max(...a.ceremony_years) : 0;
          const bMax = b.ceremony_years.length > 0 ? Math.max(...b.ceremony_years) : 0;
          comparison = aMax - bMax;
          break;
        case 'win_count':
          comparison = a.win_count - b.win_count;
          break;
        case 'nomination_count':
          comparison = a.nomination_count - b.nomination_count;
          break;
      }

      return sortState.direction === 'asc' ? comparison : -comparison;
    });

    setSortedMovies(sorted);
  }, [filteredMovies, sortState]);

  const handleSort = (column: SortColumn) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSelectedYear(null);
    setSelectedCategories([]);
  };

  const activeFilterCount = (selectedYear !== null ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortState.column !== column) {
      return <div className="w-4 h-4" />;
    }
    return sortState.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const formatNominations = (movie: OscarTableMovie) => {
    // Group nominations by category for cleaner display
    const grouped = movie.nominations.reduce((acc, nom) => {
      const key = nom.category;
      if (!acc[key]) {
        acc[key] = { winners: 0, nominees: 0, years: new Set<number>() };
      }
      if (nom.is_winner) {
        acc[key].winners++;
      } else {
        acc[key].nominees++;
      }
      acc[key].years.add(nom.ceremony_year);
      return acc;
    }, {} as Record<string, { winners: number; nominees: number; years: Set<number> }>);

    return Object.entries(grouped).map(([category, data]) => {
      const yearSuffix = data.years.size > 1 ? ` (${Array.from(data.years).sort().join(', ')})` : '';
      if (data.winners > 0) {
        return (
          <span key={category} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-blue-300 text-xs mr-1 mb-1">
            {category} <span className="text-yellow-400 font-semibold">(W)</span>{yearSuffix}
          </span>
        );
      } else {
        return (
          <span key={category} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 border border-gray-600 text-gray-300 text-xs mr-1 mb-1">
            {category} <span className="text-gray-400">(N)</span>{yearSuffix}
          </span>
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 font-medium whitespace-nowrap">Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white text-sm min-w-[120px]"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              Clear Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Categories:</label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategories.includes(category)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Movie Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {sortedMovies.length}
        {activeFilterCount > 0 && ` of ${movies.length}`} Oscar movies
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-2">
                  Movie Title
                  <SortIcon column="title" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('tmdb_id')}
              >
                <div className="flex items-center gap-2">
                  TMDB ID
                  <SortIcon column="tmdb_id" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('ceremony_years')}
              >
                <div className="flex items-center gap-2">
                  Oscar Year(s)
                  <SortIcon column="ceremony_years" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Nominations
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('win_count')}
              >
                <div className="flex items-center gap-2">
                  Stats
                  <SortIcon column="win_count" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800/50 divide-y divide-gray-700">
            {sortedMovies.map((movie, index) => (
              <tr
                key={movie.oscar_movie_id}
                className={`hover:bg-gray-700/50 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{movie.title}</span>
                    {movie.in_collection && (
                      <span title="In collection">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {movie.tmdb_id ? (
                    <span className="text-gray-300 font-mono text-sm">{movie.tmdb_id}</span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1 text-sm">
                      <AlertCircle className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {movie.ceremony_years.map(year => (
                      <span
                        key={year}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-sm"
                      >
                        {year}
                      </span>
                    ))}
                    {movie.ceremony_years.length > 1 && (
                      <span className="text-yellow-400 text-xs self-center ml-1" title="Multiple years - potential data issue">
                        ⚠️
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {formatNominations(movie)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <span className="text-yellow-400 font-semibold">{movie.win_count}W</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-gray-300">{movie.nomination_count}N</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
