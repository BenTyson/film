'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  Calendar,
  Loader2
} from 'lucide-react';
import { LazyEditOscarMovieModal as EditOscarMovieModal } from '@/components/modals';

interface OscarMovie {
  id: number;
  title: string;
  tmdb_id: number | null;
  imdb_id: string | null;
  review_status: string;
  verification_notes: string | null;
  confidence_score: number | null;
  ceremony_years: number[];
  categories: string[];
}

interface ReviewStats {
  total: number;
  auto_verified: number;
  needs_manual_review: number;
  manually_reviewed: number;
  pending: number;
  verified: number;
  needs_action: number;
  completion_percentage: number;
}

export default function OscarReviewPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<OscarMovie[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('needs_action');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<OscarMovie | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load review queue
      const statuses = statusFilter === 'needs_action'
        ? ['needs_manual_review', 'pending']
        : [statusFilter];

      const [moviesRes, statsRes] = await Promise.all([
        fetch(`/api/oscars/movies/review-queue?${statuses.map(s => `status=${s}`).join('&')}`),
        fetch('/api/oscars/movies/review-stats')
      ]);

      const moviesData = await moviesRes.json();
      const statsData = await statsRes.json();

      if (moviesData.success) {
        setMovies(moviesData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-400 bg-green-500/20 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Auto-verified
          </span>
        );
      case 'manually_reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-400 bg-blue-500/20 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Reviewed
          </span>
        );
      case 'needs_manual_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-500/20 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Needs Review
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-500/20 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/oscars')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  Oscar TMDB ID Review
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Verify and correct TMDB matches for Oscar-nominated films
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Total Movies</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-400 mb-1">Verified</p>
                <p className="text-2xl font-bold text-green-400">{stats.verified}</p>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-xs text-yellow-400 mb-1">Needs Review</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.needs_manual_review}</p>
              </div>
              <div className="p-4 bg-gray-500/10 rounded-lg border border-gray-500/30">
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-400">{stats.pending}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-xs text-blue-400 mb-1">Progress</p>
                <p className="text-2xl font-bold text-blue-400">{stats.completion_percentage}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-gray-400"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white appearance-none cursor-pointer"
            >
              <option value="needs_action">Needs Action</option>
              <option value="needs_manual_review">Needs Manual Review</option>
              <option value="pending">Pending</option>
              <option value="auto_verified">Auto-verified</option>
              <option value="manually_reviewed">Manually Reviewed</option>
            </select>
          </div>
        </div>

        {/* Movies List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery ? 'No matches found' : 'All done!'}
            </h3>
            <p className="text-gray-400">
              {searchQuery
                ? 'Try a different search term'
                : 'All movies in this category have been reviewed'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Showing {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
            </p>

            {filteredMovies.map((movie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all cursor-pointer group"
                onClick={() => setSelectedMovie(movie)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                        {movie.title}
                      </h3>
                      {getStatusBadge(movie.review_status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                      {movie.ceremony_years.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {movie.ceremony_years.join(', ')}
                        </span>
                      )}
                      {movie.categories.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {movie.categories.join(', ')}
                        </span>
                      )}
                      {movie.tmdb_id && (
                        <span className="text-xs">TMDB: {movie.tmdb_id}</span>
                      )}
                    </div>

                    {movie.verification_notes && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-200">{movie.verification_notes}</p>
                      </div>
                    )}

                    {movie.confidence_score !== null && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <div className="flex-1 max-w-xs h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              movie.confidence_score >= 0.9
                                ? 'bg-green-500'
                                : movie.confidence_score >= 0.7
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${movie.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300">
                          {(movie.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <button className="px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition-colors flex-shrink-0">
                    Review
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedMovie && (
        <EditOscarMovieModal
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
          oscarMovie={selectedMovie}
          ceremonyYear={selectedMovie.ceremony_years[0]} // Use first ceremony year
          onMovieUpdated={() => {
            setSelectedMovie(null);
            loadData(); // Refresh the list
          }}
          reviewMode={true}
        />
      )}
    </div>
  );
}
