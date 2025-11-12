'use client';

import { useEffect, useState, useMemo } from 'react';
import { OscarTableMovie, OscarTableNomination } from '@/types/api';
import { ArrowUp, ArrowDown, AlertCircle, CheckCircle2, X, User, Film, LayoutGrid, Table as TableIcon } from 'lucide-react';
import Image from 'next/image';

type SortColumn = 'title' | 'tmdb_id' | 'ceremony_years' | 'win_count' | 'nomination_count';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

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

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // Determine if we should show person thumbnails
  const personCategories = [
    'Best Actor',
    'Best Actress',
    'Best Supporting Actor',
    'Best Supporting Actress',
    'Best Director'
  ];

  const isShowingPersonCategories = useMemo(() => {
    return selectedCategories.length > 0 &&
           selectedCategories.every(cat => personCategories.includes(cat));
  }, [selectedCategories, personCategories]);

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

  // Get primary person for grid view (winner or first nominee from filtered categories)
  const getPrimaryPerson = (movie: OscarTableMovie) => {
    if (!isShowingPersonCategories) return null;

    // Get nominations matching selected categories
    const relevantNoms = movie.nominations.filter(nom =>
      selectedCategories.includes(nom.category)
    );

    // Prefer winner, otherwise first nominee
    const winner = relevantNoms.find(nom => nom.is_winner);
    const primary = winner || relevantNoms[0];

    return primary || null;
  };

  const formatNominations = (movie: OscarTableMovie) => {
    // Categories that have person nominees (actors/actresses/directors)
    const personCategories = [
      'Best Actor',
      'Best Actress',
      'Best Supporting Actor',
      'Best Supporting Actress',
      'Best Director'
    ];

    // Group nominations by category for cleaner display
    const grouped = movie.nominations.reduce((acc, nom) => {
      const key = nom.category;
      if (!acc[key]) {
        acc[key] = {
          winners: [],
          nominees: [],
          years: new Set<number>(),
          hasPersonData: personCategories.includes(nom.category)
        };
      }
      if (nom.is_winner) {
        acc[key].winners.push(nom);
      } else {
        acc[key].nominees.push(nom);
      }
      acc[key].years.add(nom.ceremony_year);
      return acc;
    }, {} as Record<string, { winners: OscarTableNomination[]; nominees: OscarTableNomination[]; years: Set<number>; hasPersonData: boolean }>);

    return Object.entries(grouped).map(([category, data]) => {
      const yearSuffix = data.years.size > 1 ? ` (${Array.from(data.years).sort().join(', ')})` : '';
      const nominees = [...data.winners, ...data.nominees];

      // For person categories (acting, director), show clean thumbnails
      if (data.hasPersonData && nominees.some(n => n.nominee_name)) {
        return (
          <div key={category} className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5">{category}</div>
            <div className="space-y-1">
              {nominees.map((nom, idx) => (
                <div
                  key={`${category}-${idx}`}
                  className={`flex items-center gap-2 py-0.5 ${
                    nom.is_winner ? 'font-semibold' : ''
                  }`}
                >
                  {/* Person Thumbnail */}
                  <div className="flex-shrink-0">
                    {nom.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${nom.profile_path}`}
                        alt={nom.nominee_name || 'Nominee'}
                        width={28}
                        height={28}
                        className="rounded-full object-cover ring-1 ring-gray-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center ring-1 ring-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Nominee Name */}
                  <div className={`text-sm flex-1 min-w-0 ${
                    nom.is_winner
                      ? 'text-white bg-yellow-500/10 px-2 py-0.5 rounded'
                      : 'text-gray-300'
                  }`}>
                    {nom.nominee_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // For non-person categories (Best Picture, etc.), minimal badges
      if (data.winners.length > 0) {
        return (
          <div key={category} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-300 text-xs font-medium mr-2 mb-1">
            {category}
            {yearSuffix && <span className="text-gray-400">{yearSuffix}</span>}
          </div>
        );
      } else {
        return (
          <div key={category} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/50 text-gray-400 text-xs mr-2 mb-1">
            {category}
            {yearSuffix && <span className="text-gray-500">{yearSuffix}</span>}
          </div>
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
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
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

          {/* View Toggle */}
          <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 transition-all flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 transition-all flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Table</span>
            </button>
          </div>
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

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {sortedMovies.map((movie) => {
            const primaryPerson = getPrimaryPerson(movie);
            const showPersonThumbnail = isShowingPersonCategories && primaryPerson;

            return (
              <div
                key={movie.oscar_movie_id}
                className="group relative cursor-pointer"
              >
                <div className="relative rounded-lg overflow-hidden ring-1 ring-gray-700 hover:ring-2 hover:ring-blue-500 transition-all duration-300 hover:scale-105">
                  {/* Thumbnail */}
                  <div className="aspect-[2/3] relative bg-gradient-to-br from-gray-800 to-gray-900">
                    {showPersonThumbnail ? (
                      // Show person thumbnail (default) with movie poster on hover
                      <>
                        {/* Person Photo - visible by default, hidden on hover */}
                        {primaryPerson.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${primaryPerson.profile_path}`}
                            alt={primaryPerson.nominee_name || movie.title}
                            fill
                            className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 12.5vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0">
                            <User className="w-12 h-12 text-gray-600" />
                          </div>
                        )}

                        {/* Movie Poster - hidden by default, visible on hover */}
                        {movie.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 12.5vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Film className="w-12 h-12 text-gray-600" />
                          </div>
                        )}
                      </>
                    ) : (
                      // Show movie poster only
                      movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 12.5vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-gray-600" />
                        </div>
                      )
                    )}

                    {/* Win Badge */}
                    {movie.win_count > 0 && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        🏆 {movie.win_count}
                      </div>
                    )}

                    {/* Collection Badge */}
                    {movie.in_collection && (
                      <div className="absolute top-2 left-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 drop-shadow-lg" />
                      </div>
                    )}
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="space-y-1">
                      {showPersonThumbnail && primaryPerson && (
                        <p className="text-white font-semibold text-sm truncate">
                          {primaryPerson.nominee_name}
                        </p>
                      )}
                      <p className={`text-white text-xs truncate ${showPersonThumbnail ? 'font-normal' : 'font-semibold'}`}>
                        {movie.title}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {movie.ceremony_years.slice(0, 2).map(year => (
                          <span
                            key={year}
                            className="px-1.5 py-0.5 rounded bg-gray-700/80 text-gray-200 text-xs"
                          >
                            {year}
                          </span>
                        ))}
                        {movie.ceremony_years.length > 2 && (
                          <span className="text-yellow-400 text-xs">+{movie.ceremony_years.length - 2}</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-xs">
                        {movie.win_count}W / {movie.nomination_count}N
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-lg border border-gray-700/50">
          <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '30%' }} /> {/* Poster + Title */}
            <col style={{ width: '8%' }} />  {/* TMDB ID */}
            <col style={{ width: '12%' }} /> {/* Years */}
            <col style={{ width: '40%' }} /> {/* Nominations */}
            <col style={{ width: '10%' }} /> {/* Stats */}
          </colgroup>
          <thead className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700/50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-2">
                  Movie
                  <SortIcon column="title" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('tmdb_id')}
              >
                <div className="flex items-center gap-2">
                  ID
                  <SortIcon column="tmdb_id" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('ceremony_years')}
              >
                <div className="flex items-center gap-2">
                  Year(s)
                  <SortIcon column="ceremony_years" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Nominations
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('win_count')}
              >
                <div className="flex items-center gap-2">
                  Stats
                  <SortIcon column="win_count" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800/30 divide-y divide-gray-700/30">
            {sortedMovies.map((movie) => (
              <tr
                key={movie.oscar_movie_id}
                className="hover:bg-gray-700/30 transition-colors border-b border-gray-700/20"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {/* Movie Poster */}
                    <div className="flex-shrink-0">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                          alt={movie.title}
                          width={40}
                          height={60}
                          className="rounded shadow-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-15 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center shadow-md">
                          <Film className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white font-medium truncate">{movie.title}</span>
                      {movie.in_collection && (
                        <span title="In collection">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {movie.tmdb_id ? (
                    <span className="text-gray-400 font-mono text-xs">{movie.tmdb_id}</span>
                  ) : (
                    <span className="text-red-400/60 flex items-center gap-1 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      N/A
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {movie.ceremony_years.map(year => (
                      <span
                        key={year}
                        className="px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-300 text-xs font-medium"
                      >
                        {year}
                      </span>
                    ))}
                    {movie.ceremony_years.length > 1 && (
                      <span className="text-yellow-400/60 text-xs self-center" title="Multiple years">
                        ⚠️
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    {formatNominations(movie)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium">
                    <span className="text-yellow-400">{movie.win_count}W</span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-gray-400">{movie.nomination_count}N</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
