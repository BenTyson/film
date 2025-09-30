/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Database,
  FileText,
  Check,
  Settings,
  Star,
  Calendar,
  UserCheck,
  Clock,
  Edit,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FixMovieModal } from '@/components/movie/FixMovieModal';

interface PendingMovie {
  movieId: number;
  movieTitle: string;
  movieDirector: string | null;
  movieYear: number | null;
  posterPath: string | null;
  csvRowNumber: number | null;
  csvTitle: string | null;
  csvDirector: string | null;
  csvYear: string | null;
  csvNotes: string | null;
  confidenceScore: number;
  severity: 'high' | 'medium' | 'low';
  mismatches: string[];
  titleSimilarity: number;
  directorSimilarity: number;
  yearDifference: number;
  overview: string | null;
  releaseDate: Date | null;
  imdbRating: number | null;
  genres: any;
  personalRating: number | null;
  dateWatched: Date | null;
  isFavorite: boolean;
  oscarBadges: {
    nominations: number;
    wins: number;
    categories: string[];
  };
  tags: Array<{
    name: string;
    color: string | null;
    icon: string | null;
  }>;
}

interface PendingApprovalResponse {
  movies: PendingMovie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  withCsv: number;
  approvalRate: number;
  recentApprovals: Array<{
    id: number;
    title: string;
    approved_at: string;
    approved_by: string;
  }>;
}

export default function ApprovalDashboard() {
  const [loading, setLoading] = useState(true);
  const [pendingMovies, setPendingMovies] = useState<PendingMovie[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [approvedMovies, setApprovedMovies] = useState<Set<number>>(new Set());
  const [removedMovies, setRemovedMovies] = useState<Set<number>>(new Set());
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [approvingMovie, setApprovingMovie] = useState<number | null>(null);
  const [removingMovie, setRemovingMovie] = useState<number | null>(null);
  const [fixingMovieId, setFixingMovieId] = useState<number | null>(null);
  const [fixingMovie, setFixingMovie] = useState<PendingMovie | null>(null);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);

  // Filtering states
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPendingMovies = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }
      if (confidenceFilter > 0) {
        params.append('confidence', confidenceFilter.toString());
      }

      const response = await fetch(`/api/movies/pending-approval-simple?${params}`);
      const data = await response.json();

      if (data.success) {
        setPendingMovies(data.data.movies);
        setPagination(data.data.pagination);
      } else {
        console.error('Error fetching pending movies:', data.error);
      }
    } catch (error) {
      console.error('Error fetching pending movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const response = await fetch('/api/movies/approval-stats');
      const data = await response.json();
      if (data.success) {
        setApprovalStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
    }
  };

  const approveMovie = async (movieId: number) => {
    setApprovingMovie(movieId);
    try {
      const response = await fetch(`/api/movies/${movieId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'Ben' })
      });

      if (response.ok) {
        setApprovedMovies(prev => new Set(prev).add(movieId));
        fetchApprovalStats(); // Refresh stats
      } else {
        const data = await response.json();
        alert(`Failed to approve movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving movie:', error);
      alert('Failed to approve movie');
    } finally {
      setApprovingMovie(null);
    }
  };

  const removeMovie = async (movieId: number) => {
    setRemovingMovie(movieId);
    try {
      const response = await fetch(`/api/movies/${movieId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removed_by: 'Ben', reason: 'Not wanted in collection' })
      });

      if (response.ok) {
        setRemovedMovies(prev => new Set(prev).add(movieId));
        fetchApprovalStats(); // Refresh stats
      } else {
        const data = await response.json();
        alert(`Failed to remove movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error removing movie:', error);
      alert('Failed to remove movie');
    } finally {
      setRemovingMovie(null);
    }
  };


  const handleMovieFixed = async (newTmdbId: number) => {
    // Refresh the movie data after fixing
    fetchApprovalStats();
    fetchPendingMovies(); // Refresh the pending movies list

    // Close the fix modal
    setFixingMovie(null);
    setFixingMovieId(null);
  };

  const fetchMigrationStats = async () => {
    try {
      const response = await fetch('/api/movies/migrate-approval');
      const data = await response.json();
      if (data.success) {
        setMigrationStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching migration stats:', error);
    }
  };

  const runMigration = async (dryRun = true) => {
    setMigrating(true);
    try {
      const response = await fetch('/api/movies/migrate-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });

      const data = await response.json();
      if (data.success) {
        setMigrationStats(data.data.stats);
        fetchApprovalStats(); // Refresh approval stats
        if (!dryRun) {
          alert(`Successfully migrated ${data.data.stats.migrated} movies to pending approval status`);
        }
      } else {
        alert(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      alert('Failed to run migration');
    } finally {
      setMigrating(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchPendingMovies();
    fetchApprovalStats();
    fetchMigrationStats();
  }, [severityFilter, confidenceFilter]);

  // Filter movies by search query (client-side for now)
  const filteredMovies = searchQuery
    ? pendingMovies.filter(movie =>
        movie.movieTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.csvTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.movieDirector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.csvDirector?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pendingMovies;

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/import"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Import
            </Link>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-heading font-bold mb-2">Ben's Approval Dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Review and approve movies requiring your approval. Fix any problematic matches and approve movies to lock them into your collection.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && pendingMovies.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Real-time Approval Stats */}
            {approvalStats && (
              <div className="bg-card/50 rounded-xl border border-border/50 p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Ben's Approval Dashboard
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{approvalStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Movies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">{approvalStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{approvalStats.approved}</div>
                    <div className="text-sm text-muted-foreground">Ben's Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{approvalStats.withCsv}</div>
                    <div className="text-sm text-muted-foreground">With CSV Data</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-500">{approvalStats.approvalRate}%</div>
                    <div className="text-sm text-muted-foreground">Approval Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{approvalStats.recentApprovals.length}</div>
                    <div className="text-sm text-muted-foreground">Recent Approvals</div>
                  </div>
                </div>
              </div>
            )}


            {/* Filtering Options */}
            <div className="bg-card/50 rounded-xl border border-border/50 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter & Search
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search movies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Severity Filter */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All Severity</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                {/* Confidence Filter */}
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
                  className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={0}>All Confidence</option>
                  <option value={50}>Low Confidence (&lt;50%)</option>
                  <option value={80}>Medium Confidence (&lt;80%)</option>
                  <option value={100}>All Movies</option>
                </select>

                {/* Quick Stats */}
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-medium">{filteredMovies.length}</span>
                  <span>of</span>
                  <span className="font-medium">{pagination?.total || 0}</span>
                  <span>movies</span>
                </div>
              </div>
            </div>

            {/* Pending Movies */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pending Approval ({filteredMovies.length})</h3>

              {filteredMovies.map((movie) => {
                const isApproved = approvedMovies.has(movie.movieId);
                const isRemoved = removedMovies.has(movie.movieId);
                const isApproving = approvingMovie === movie.movieId;
                const isRemoving = removingMovie === movie.movieId;

                const posterUrl = movie.posterPath
                  ? `https://image.tmdb.org/t/p/w200${movie.posterPath}`
                  : null;

                return (
                  <div
                    key={movie.movieId}
                    className={cn(
                      "bg-card/50 rounded-lg border p-4 transition-all duration-200",
                      movie.severity === 'high' ? "border-red-500/40" :
                      movie.severity === 'medium' ? "border-orange-500/40" : "border-green-500/40",
                      isApproved && "opacity-75",
                      isRemoved && "opacity-50 bg-red-500/5 border-red-500/30"
                    )}
                  >
                    <div className="flex gap-4">
                      {/* Movie Poster */}
                      <div className="flex-shrink-0">
                        <div className="w-48 h-72 bg-muted/20 rounded-lg border overflow-hidden flex items-center justify-center shadow-lg">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={movie.movieTitle}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                (e.currentTarget.parentElement as HTMLElement)?.classList.add('!bg-muted/40');
                              }}
                            />
                          ) : (
                            <div className="text-center text-muted-foreground p-2">
                              <FileText className="w-6 h-6 mx-auto mb-1" />
                              <span className="text-xs">No Poster</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        {/* Prominent Movie Title */}
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-foreground mb-1">{movie.movieTitle}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {movie.movieDirector && (
                              <>
                                <span>{movie.movieDirector}</span>
                                <span>•</span>
                              </>
                            )}
                            {movie.movieYear && <span>{movie.movieYear}</span>}
                          </div>
                        </div>

                        {/* Match Quality Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              movie.severity === 'high' ? "bg-red-500/20 text-red-400" :
                              movie.severity === 'medium' ? "bg-orange-500/20 text-orange-400" :
                              "bg-green-500/20 text-green-400"
                            )}>
                              {movie.severity === 'high' ? <XCircle className="w-3 h-3" /> :
                               movie.severity === 'medium' ? <AlertTriangle className="w-3 h-3" /> :
                               <CheckCircle className="w-3 h-3" />}
                              {movie.confidenceScore}% Confidence
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {!isApproved && !isRemoved && (
                              <>
                                <button
                                  onClick={() => {
                                    setFixingMovie(movie);
                                    setFixingMovieId(movie.movieId);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 border border-border rounded text-sm hover:bg-muted/50 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  Fix
                                </button>

                                <button
                                  onClick={() => approveMovie(movie.movieId)}
                                  disabled={isApproving}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  {isApproving ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3 h-3" />
                                  )}
                                  Ben Approves
                                </button>

                                <button
                                  onClick={() => removeMovie(movie.movieId)}
                                  disabled={isRemoving}
                                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                  {isRemoving ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  Remove
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <div className="flex items-center gap-1 text-green-500 text-sm">
                                <UserCheck className="w-4 h-4" />
                                Ben's Approved
                              </div>
                            )}

                            {isRemoved && (
                              <div className="flex items-center gap-1 text-red-500 text-sm">
                                <XCircle className="w-4 h-4" />
                                Removed
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compact TMDB vs CSV Comparison */}
                        {movie.csvRowNumber ? (
                          <div className="bg-muted/10 rounded-lg p-4 mb-3">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                              <Database className="w-4 h-4" />
                              TMDB vs CSV Data Comparison
                              <span className="text-xs text-muted-foreground">(Row #{movie.csvRowNumber})</span>
                            </h4>
                            <div className="space-y-3 text-base">
                              {/* Title Comparison */}
                              <div className="grid grid-cols-3 gap-3 items-center">
                                <span className="text-muted-foreground font-medium text-sm">Title:</span>
                                <div className="bg-blue-500/10 px-3 py-2 rounded text-sm">
                                  <span className="text-blue-400 font-medium">TMDB:</span> {movie.movieTitle}
                                </div>
                                <div className="bg-orange-500/10 px-3 py-2 rounded text-sm">
                                  <span className="text-orange-400 font-medium">CSV:</span> {movie.csvTitle}
                                </div>
                              </div>

                              {/* Director Comparison */}
                              {(movie.movieDirector || movie.csvDirector) && (
                                <div className="grid grid-cols-3 gap-3 items-center">
                                  <span className="text-muted-foreground font-medium text-sm">Director:</span>
                                  <div className="bg-blue-500/10 px-3 py-2 rounded text-sm">
                                    <span className="text-blue-400 font-medium">TMDB:</span> {movie.movieDirector || 'N/A'}
                                  </div>
                                  <div className="bg-orange-500/10 px-3 py-2 rounded text-sm">
                                    <span className="text-orange-400 font-medium">CSV:</span> {movie.csvDirector || 'N/A'}
                                  </div>
                                </div>
                              )}

                              {/* Year Comparison */}
                              {(movie.movieYear || movie.csvYear) && (
                                <div className="grid grid-cols-3 gap-3 items-center">
                                  <span className="text-muted-foreground font-medium text-sm">Year:</span>
                                  <div className="bg-blue-500/10 px-3 py-2 rounded text-sm">
                                    <span className="text-blue-400 font-medium">TMDB:</span> {movie.movieYear || 'N/A'}
                                  </div>
                                  <div className="bg-orange-500/10 px-3 py-2 rounded text-sm">
                                    <span className="text-orange-400 font-medium">CSV:</span> {movie.csvYear || 'N/A'}
                                  </div>
                                </div>
                              )}

                              {/* CSV Notes */}
                              {movie.csvNotes && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <span className="text-muted-foreground font-medium text-sm">CSV Notes:</span>
                                  <div className="bg-muted/20 px-3 py-2 rounded mt-2 text-sm">{movie.csvNotes}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/10 rounded-lg p-4 mb-3">
                            <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                              <Database className="w-4 h-4" />
                              No CSV Data Available
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              This movie doesn't have associated CSV data for comparison.
                            </p>
                          </div>
                        )}

                        {/* Match Analysis */}
                        <div className="bg-muted/10 rounded p-3">
                          <div className="grid grid-cols-3 gap-4 mb-2">
                            <div className="text-center">
                              <div className="text-sm font-medium text-blue-400">{movie.titleSimilarity}%</div>
                              <div className="text-xs text-muted-foreground">Title Match</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-purple-400">{movie.directorSimilarity}%</div>
                              <div className="text-xs text-muted-foreground">Director Match</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-orange-400">{movie.yearDifference} yr</div>
                              <div className="text-xs text-muted-foreground">Year Diff</div>
                            </div>
                          </div>

                          {movie.mismatches.length > 0 && (
                            <div className="text-xs text-red-400">
                              <strong>Issues:</strong> {movie.mismatches.join(', ')}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground mt-1">
                            <strong>Issues:</strong> {movie.mismatches.length > 0 ? movie.mismatches.join(', ') : 'No issues detected'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredMovies.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>No pending movies found. All movies have been approved!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Fix Movie Modal */}
      {fixingMovie && (
        <FixMovieModal
          isOpen={true}
          onClose={() => {
            setFixingMovie(null);
            setFixingMovieId(null);
          }}
          currentMovie={{
            id: fixingMovie.movieId,
            title: fixingMovie.movieTitle,
            director: fixingMovie.movieDirector,
            release_date: fixingMovie.movieYear ? new Date(fixingMovie.movieYear, 0, 1) : null
          }}
          csvData={{
            title: fixingMovie.csvTitle || '',
            director: fixingMovie.csvDirector || '',
            year: fixingMovie.csvYear || ''
          }}
          onMovieFixed={handleMovieFixed}
        />
      )}
    </div>
  );
}