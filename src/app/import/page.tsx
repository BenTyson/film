/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  ArrowLeft,
  File,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Loader2,
  Download,
  Users,
  Calendar,
  Film,
  X,
  Search,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportResult {
  success: boolean;
  movieTitle: string;
  tmdbMatch?: {
    title: string;
    release_date: string;
    tmdb_id: number;
  };
  error?: string;
  alreadyExists?: boolean;
}

interface FailedMovie {
  '#': string;
  'Yr': string;
  'Title': string;
  'Dir.': string;
  'Notes': string;
  'Completed': string;
  failureReason: string;
  tmdbSearchResults?: any[];
  suggestedActions?: string[];
}

interface ImportResponse {
  success: boolean;
  data: {
    results: ImportResult[];
    stats: {
      total: number;
      successful: number;
      skipped: number;
      errors: number;
      alreadyExists: number;
    };
    dryRun: boolean;
  };
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importStats, setImportStats] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [failedMovies, setFailedMovies] = useState<FailedMovie[]>([]);

  // Manual search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedFailedMovie, setSelectedFailedMovie] = useState<FailedMovie | null>(null);
  const [selectedMovieIndex, setSelectedMovieIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMethod, setSearchMethod] = useState<string>('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Resolved movies tracking
  const [resolvedMovies, setResolvedMovies] = useState<Set<string>>(new Set());

  // Load saved import results on component mount
  useEffect(() => {
    const savedResults = localStorage.getItem('lastImportResults');
    const savedStats = localStorage.getItem('lastImportStats');
    const savedIsDryRun = localStorage.getItem('lastImportIsDryRun');
    const savedFailedMovies = localStorage.getItem('lastFailedMovies');
    const savedResolvedMovies = localStorage.getItem('resolvedMovies');

    if (savedResults && savedStats) {
      setImportResults(JSON.parse(savedResults));
      setImportStats(JSON.parse(savedStats));
      // Load isDryRun state - default to false for completed imports
      setIsDryRun(savedIsDryRun ? JSON.parse(savedIsDryRun) : false);
      setCurrentStep('results');
    }

    if (savedFailedMovies) {
      setFailedMovies(JSON.parse(savedFailedMovies));
    }

    if (savedResolvedMovies) {
      setResolvedMovies(new Set(JSON.parse(savedResolvedMovies)));
    }
  }, []);

  // Save failed movies to localStorage whenever it changes
  useEffect(() => {
    if (failedMovies.length > 0) {
      localStorage.setItem('lastFailedMovies', JSON.stringify(failedMovies));
    }
  }, [failedMovies]);

  // Save resolved movies to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('resolvedMovies', JSON.stringify(Array.from(resolvedMovies)));
  }, [resolvedMovies]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');

      // Simple CSV parser that handles quoted fields
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }

        result.push(current.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]);

      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = parseCsvLine(line);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        })
        .filter(row => row.Title && row.Title.trim()); // Only rows with titles

      console.log('Parsed CSV data:', data.slice(0, 5)); // Debug first 5 rows
      setCsvData(data);
      setCurrentStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async (dryRun: boolean = false) => {
    setIsProcessing(true);
    setIsDryRun(dryRun);

    try {
      console.log('Starting import...', { dryRun, csvDataLength: csvData.length });

      const moviesToImport = dryRun ? csvData.slice(0, 20) : csvData;
      const batchSize = dryRun ? 20 : 100;
      const batches = [];

      // Split into batches
      for (let i = 0; i < moviesToImport.length; i += batchSize) {
        batches.push(moviesToImport.slice(i, i + batchSize));
      }

      console.log(`Processing ${moviesToImport.length} movies in ${batches.length} batches of ${batchSize}`);

      let allResults: ImportResult[] = [];
      const totalStats = {
        total: 0,
        successful: 0,
        skipped: 0,
        errors: 0,
        alreadyExists: 0
      };

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} movies)`);

        const response = await fetch('/api/import/csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvData: batch,
            dryRun
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('HTTP error:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data: ImportResponse = await response.json();

        if (data && data.success && data.data) {
          allResults = [...allResults, ...data.data.results];
          totalStats.total += data.data.stats.total;
          totalStats.successful += data.data.stats.successful;
          totalStats.skipped += data.data.stats.skipped;
          totalStats.errors += data.data.stats.errors;
          totalStats.alreadyExists += data.data.stats.alreadyExists;

          console.log(`Batch ${i + 1} complete: ${data.data.stats.successful}/${data.data.stats.total} successful`);
        } else {
          throw new Error(`Batch ${i + 1} failed`);
        }

        // Small delay between batches to avoid overwhelming the server
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('All batches complete:', totalStats);

      // Save results to localStorage for persistence
      localStorage.setItem('lastImportResults', JSON.stringify(allResults));
      localStorage.setItem('lastImportStats', JSON.stringify(totalStats));
      localStorage.setItem('lastImportDate', new Date().toISOString());
      localStorage.setItem('lastImportIsDryRun', JSON.stringify(dryRun));

      setImportResults(allResults);
      setImportStats(totalStats);
      setCurrentStep('results');

    } catch (error) {
      console.error('Error importing CSV:', error);
      alert(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getResultIcon = (result: ImportResult) => {
    if (result.success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (result.alreadyExists) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getResultColor = (result: ImportResult) => {
    if (result.success) return 'border-green-500/20 bg-green-500/5';
    if (result.alreadyExists) return 'border-yellow-500/20 bg-yellow-500/5';
    return 'border-red-500/20 bg-red-500/5';
  };

  const downloadFailedMovies = () => {
    const failedMovies = importResults.filter(result => !result.success && !result.alreadyExists);

    if (failedMovies.length === 0) {
      alert('No failed movies to download!');
      return;
    }

    const csvContent = [
      'Movie Title,Error,TMDB Match',
      ...failedMovies.map(movie =>
        `"${movie.movieTitle}","${movie.error || 'Unknown error'}","${movie.tmdbMatch?.title || 'None'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-movies-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const findMissingMovies = async () => {
    if (!csvData || csvData.length === 0) {
      alert('Please upload a CSV file first!');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/import/missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      const data = await response.json();

      if (data.success) {
        // Filter out already resolved movies
        const unresolvedFailedMovies = data.data.failedMovies.filter((movie: FailedMovie) => {
          const movieKey = `${movie.Title}_${movie.Yr || ''}`;
          return !resolvedMovies.has(movieKey);
        });

        setFailedMovies(unresolvedFailedMovies);
        setImportStats({
          total: data.data.totalInCsv,
          successful: data.data.totalInDatabase + resolvedMovies.size,
          errors: unresolvedFailedMovies.length,
          skipped: 0,
          alreadyExists: 0
        });
        setCurrentStep('results');
      } else {
        console.error('Error finding missing movies:', data.error);
        alert('Error finding missing movies. Please try again.');
      }
    } catch (error) {
      console.error('Error finding missing movies:', error);
      alert('Error finding missing movies. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFailedMoviesCSV = () => {
    if (failedMovies.length === 0) {
      alert('No failed movies to download!');
      return;
    }

    const csvContent = [
      '#,Yr,Title,Dir.,Notes,Completed,Failure Reason,Suggested Actions',
      ...failedMovies.map(movie =>
        `"${movie['#']}","${movie['Yr']}","${movie['Title']}","${movie['Dir.']}","${movie['Notes']}","${movie['Completed']}","${movie.failureReason}","${movie.suggestedActions?.join('; ') || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-movies-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearImportResults = () => {
    localStorage.removeItem('lastImportResults');
    localStorage.removeItem('lastImportStats');
    localStorage.removeItem('lastImportDate');
    localStorage.removeItem('lastImportIsDryRun');
    localStorage.removeItem('lastFailedMovies');
    localStorage.removeItem('resolvedMovies');
    setImportResults([]);
    setImportStats(null);
    setFailedMovies([]);
    setResolvedMovies(new Set());
    setIsDryRun(true); // Reset to default
    setCurrentStep('upload');
  };

  const retryMovieImport = async (movie: FailedMovie, tmdbResult: any) => {
    try {
      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdb_id: tmdbResult.id,
          personal_rating: null,
          date_watched: movie.Completed,
          is_favorite: false,
          buddy_watched_with: null,
          tags: []
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully imported "${tmdbResult.title}"!`);
        // Remove this movie from failed movies list
        setFailedMovies(prev => prev.filter((_, index) => prev.indexOf(movie) !== index));
      } else {
        alert(`Failed to import "${tmdbResult.title}": ${data.error}`);
      }
    } catch (error) {
      console.error('Error retrying movie import:', error);
      alert('Error retrying movie import. Please try again.');
    }
  };

  const editMovieTitle = (movieIndex: number) => {
    const movie = failedMovies[movieIndex];
    const newTitle = prompt(`Edit movie title:`, movie.Title);

    if (newTitle && newTitle.trim() !== movie.Title) {
      // Update the movie title in the failed movies list
      setFailedMovies(prev =>
        prev.map((m, index) =>
          index === movieIndex
            ? { ...m, Title: newTitle.trim() }
            : m
        )
      );

      // Optionally, you could immediately re-search TMDB with the new title
      alert(`Title updated to "${newTitle.trim()}". You can now retry the import or run "Find Missing Movies" again to re-analyze.`);
    }
  };

  const analyzeFailedMoviesFromResults = async () => {
    // Get failed movies from import results
    const failedMoviesFromImport = importResults.filter(r => !r.success && !r.alreadyExists);

    if (failedMoviesFromImport.length === 0) {
      alert('No failed movies to analyze!');
      return;
    }

    // Convert import results back to CSV format for analysis
    const csvDataForAnalysis = failedMoviesFromImport.map(result => ({
      '#': '', // We don't have original CSV row number
      'Yr': '', // We don't have year from import results
      'Title': result.movieTitle,
      'Dir.': '', // We don't have director from import results
      'Notes': '',
      'Completed': ''
    }));

    setIsProcessing(true);
    try {
      const response = await fetch('/api/import/missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData: csvDataForAnalysis }),
      });

      const data = await response.json();

      if (data.success) {
        // Filter out already resolved movies
        const unresolvedFailedMovies = data.data.failedMovies.filter((movie: FailedMovie) => {
          const movieKey = `${movie.Title}_${movie.Yr || ''}`;
          return !resolvedMovies.has(movieKey);
        });

        setFailedMovies(unresolvedFailedMovies);
        setImportStats({
          total: data.data.totalInCsv,
          successful: data.data.totalInDatabase + resolvedMovies.size,
          errors: unresolvedFailedMovies.length,
          skipped: 0,
          alreadyExists: 0
        });
        // Don't change the step - stay on results but show the analysis
      } else {
        console.error('Error analyzing failed movies:', data.error);
        alert('Error analyzing failed movies. Please try again.');
      }
    } catch (error) {
      console.error('Error analyzing failed movies:', error);
      alert('Error analyzing failed movies. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual search modal functions
  const openSearchModal = (movie: FailedMovie, index: number) => {
    setSelectedFailedMovie(movie);
    setSelectedMovieIndex(index);
    setSearchQuery(movie.Title);
    setSearchResults([]);
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    setSelectedFailedMovie(null);
    setSelectedMovieIndex(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchMethod('');
    setShowAdvancedSearch(false);
  };

  const performTMDBSearch = async (enhanced = true) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchMethod('');
    try {
      const response = await fetch('/api/tmdb/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, enhanced }),
      });
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
        setSearchMethod(data.searchMethod || 'unknown');

        if (data.results.length === 0) {
          // If enhanced search failed, automatically try basic search
          if (enhanced) {
            console.log('Enhanced search found no results, trying basic search...');
            setTimeout(() => performTMDBSearch(false), 1000);
            return;
          }
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching TMDB:', error);
      alert('Error searching TMDB. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectMovieForImport = async (tmdbMovie: any) => {
    if (!selectedFailedMovie || selectedMovieIndex === null) return;

    const movieData = {
      tmdb_id: tmdbMovie.id,
      personal_rating: null,
      date_watched: selectedFailedMovie.Completed || null,
      is_favorite: false,
      buddy_watched_with: selectedFailedMovie.Notes?.toLowerCase().includes('calen') ? 'Calen' : null,
      tags: selectedFailedMovie.Notes?.toLowerCase().includes('calen') ? ['Calen'] : [],
      notes: selectedFailedMovie.Notes || null
    };

    try {
      // First try to import as new movie
      let response = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData),
      });

      let data = await response.json();

      if (data.success) {
        alert(`Successfully imported "${tmdbMovie.title}"!`);
        // Mark movie as resolved and remove from failed list
        const movieKey = `${selectedFailedMovie.Title}_${selectedFailedMovie.Yr || ''}`;
        setResolvedMovies(prev => new Set(prev).add(movieKey));
        setFailedMovies(prev => prev.filter((_, index) => index !== selectedMovieIndex));
        closeSearchModal();
        return;
      }

      // If import failed because movie already exists, try linking instead
      if (response.status === 409 || data.error?.includes('already exists')) {
        response = await fetch('/api/movies/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movieData),
        });

        data = await response.json();

        if (data.success) {
          alert(`Successfully linked to existing movie "${tmdbMovie.title}"!`);
          // Mark movie as resolved and remove from failed list
          const movieKey = `${selectedFailedMovie.Title}_${selectedFailedMovie.Yr || ''}`;
          setResolvedMovies(prev => new Set(prev).add(movieKey));
          setFailedMovies(prev => prev.filter((_, index) => index !== selectedMovieIndex));
          closeSearchModal();
        } else {
          alert(`Failed to link to "${tmdbMovie.title}": ${data.error}`);
        }
      } else {
        alert(`Failed to import "${tmdbMovie.title}": ${data.error}`);
      }
    } catch (error) {
      console.error('Error importing/linking selected movie:', error);
      alert('Error importing movie. Please try again.');
    }
  };

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/movies')}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-purple-400" />
              <h1 className="text-4xl font-heading font-bold">
                Import Movies
              </h1>
            </div>
          </div>

          <p className="text-muted-foreground">
            Import your movie collection from CSV. We'll match titles with TMDB for accurate data.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="max-w-2xl mx-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/50 rounded-lg p-12 hover:border-purple-500/50 transition-colors cursor-pointer group"
                >
                  <File className="w-16 h-16 text-muted-foreground mx-auto mb-4 group-hover:text-purple-400 transition-colors" />
                  <h3 className="text-xl font-semibold mb-2">Upload CSV File</h3>
                  <p className="text-muted-foreground mb-4">
                    Select your movies.csv file to begin the import process
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expected format: #, Yr, Title, Dir., Notes, Completed
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {csvFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-card/30 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <File className="w-5 h-5 text-purple-400" />
                      <span className="font-medium">{csvFile.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({Math.round(csvFile.size / 1024)} KB)
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={findMissingMovies}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        Find Missing Movies
                      </button>

                      <button
                        onClick={() => setCurrentStep('preview')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        Continue Import
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                  <Film className="w-6 h-6 text-purple-400" />
                  Preview Import
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-background/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">{csvData.length}</div>
                    <div className="text-sm text-muted-foreground">Total Movies</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {csvData.filter(row => row.Notes?.toLowerCase().includes('calen')).length}
                    </div>
                    <div className="text-sm text-muted-foreground">With Calen</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {csvData.filter(row => row.Completed).length}
                    </div>
                    <div className="text-sm text-muted-foreground">With Dates</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Sample Movies</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {csvData.slice(0, 10).map((movie, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background/30 rounded border border-border/20">
                        <div>
                          <div className="font-medium">{movie.Title}</div>
                          <div className="text-sm text-muted-foreground">
                            {movie.Yr && `${movie.Yr} • `}
                            {movie.Notes && (
                              <span className="inline-flex items-center gap-1">
                                {movie.Notes.toLowerCase().includes('calen') && <Users className="w-3 h-3" />}
                                {movie.Notes}
                              </span>
                            )}
                          </div>
                        </div>
                        {movie.Completed && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Calendar className="w-3 h-3" />
                            {movie.Completed}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleImport(true)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing && isDryRun ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Test Import (20 movies)
                  </button>
                  <button
                    onClick={() => handleImport(false)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors disabled:opacity-50"
                  >
                    {isProcessing && !isDryRun ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Full Import ({csvData.length} movies)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                      Import {isDryRun ? 'Preview' : 'Complete'}
                    </h2>
                    {localStorage.getItem('lastImportDate') && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {isDryRun ? 'Preview' : 'Completed'}: {new Date(localStorage.getItem('lastImportDate')!).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isDryRun && importResults.length > 0 && (
                      <button
                        onClick={downloadFailedMovies}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Failed Movies
                      </button>
                    )}
                    {failedMovies.length > 0 && (
                      <button
                        onClick={downloadFailedMoviesCSV}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Failed Movies
                      </button>
                    )}
                    {!isDryRun && importResults.filter(r => !r.success && !r.alreadyExists).length > 0 && (
                      <button
                        onClick={analyzeFailedMoviesFromResults}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        Analyze Failed Movies
                      </button>
                    )}
                    <button
                      onClick={clearImportResults}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Clear Results
                    </button>
                    {resolvedMovies.size > 0 && (
                      <button
                        onClick={() => {
                          setResolvedMovies(new Set());
                          localStorage.removeItem('resolvedMovies');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        title="Reset resolved movies tracking"
                      >
                        <X className="w-4 h-4" />
                        Reset Resolved ({resolvedMovies.size})
                      </button>
                    )}
                  </div>
                </div>

                {importStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-background/50 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold">{importStats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-green-400">{importStats.successful}</div>
                      <div className="text-xs text-muted-foreground">Success</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-yellow-400">{importStats.alreadyExists}</div>
                      <div className="text-xs text-muted-foreground">Exists</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-red-400">{importStats.errors}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                    <div className="bg-gray-500/10 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-gray-400">{importStats.skipped}</div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                  </div>
                )}

                {failedMovies.length > 0 ? (
                  <div className="bg-background/30 rounded-lg border border-border/50 overflow-hidden">
                    <div className="p-4 border-b border-border/50">
                      <h3 className="text-lg font-semibold text-orange-500 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Failed Movies Analysis ({failedMovies.length} unresolved, {resolvedMovies.size} resolved)
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Each movie below was analyzed for failure reasons with suggested actions
                      </p>
                    </div>

                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-background/50 sticky top-0">
                          <tr className="border-b border-border/50">
                            <th className="text-left p-3 font-medium">#</th>
                            <th className="text-left p-3 font-medium">Title</th>
                            <th className="text-left p-3 font-medium">Year</th>
                            <th className="text-left p-3 font-medium">Director</th>
                            <th className="text-left p-3 font-medium">Failure Reason</th>
                            <th className="text-left p-3 font-medium">TMDB Results</th>
                            <th className="text-left p-3 font-medium">Suggested Actions</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedMovies.map((movie, index) => (
                            <tr key={index} className="border-b border-border/30 hover:bg-background/20">
                              <td className="p-3 text-muted-foreground">{movie['#']}</td>
                              <td className="p-3">
                                <div className="font-medium">{movie.Title}</div>
                                {movie.Notes && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Notes: {movie.Notes}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-muted-foreground">{movie.Yr}</td>
                              <td className="p-3 text-muted-foreground">{movie['Dir.']}</td>
                              <td className="p-3">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                  movie.failureReason.includes('No TMDB') ? 'bg-red-500/10 text-red-400' :
                                  movie.failureReason.includes('Multiple') ? 'bg-yellow-500/10 text-yellow-400' :
                                  movie.failureReason.includes('found but') ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-gray-500/10 text-gray-400'
                                )}>
                                  {movie.failureReason}
                                </span>
                              </td>
                              <td className="p-3">
                                {movie.tmdbSearchResults && movie.tmdbSearchResults.length > 0 ? (
                                  <div className="space-y-1">
                                    {movie.tmdbSearchResults.slice(0, 2).map((result, idx) => (
                                      <div key={idx} className="text-xs">
                                        <div className="font-medium text-green-400">
                                          {result.title} ({new Date(result.release_date).getFullYear()})
                                        </div>
                                        <div className="text-muted-foreground">
                                          TMDB ID: {result.id}
                                        </div>
                                      </div>
                                    ))}
                                    {movie.tmdbSearchResults.length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{movie.tmdbSearchResults.length - 2} more...
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No matches</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {movie.suggestedActions?.map((action, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground">
                                      • {action}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  {movie.tmdbSearchResults && movie.tmdbSearchResults.length > 0 && (
                                    <button
                                      onClick={() => retryMovieImport(movie, movie.tmdbSearchResults![0])}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                      title="Retry with first TMDB match"
                                    >
                                      Retry
                                    </button>
                                  )}
                                  <button
                                    onClick={() => editMovieTitle(index)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    title="Edit movie title"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => openSearchModal(movie, index)}
                                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                    title="Search TMDB manually"
                                  >
                                    Search
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : importResults.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResults.map((result, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-3 rounded border",
                          getResultColor(result)
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {getResultIcon(result)}
                          <div>
                            <div className="font-medium">{result.movieTitle}</div>
                            {result.tmdbMatch && (
                              <div className="text-sm text-green-400">
                                Matched: {result.tmdbMatch.title} ({new Date(result.tmdbMatch.release_date).getFullYear()})
                              </div>
                            )}
                            {result.error && (
                              <div className="text-sm text-red-400">{result.error}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => {
                      setCurrentStep('preview');
                      setImportResults([]);
                      setImportStats(null);
                      setIsDryRun(true);
                    }}
                    className="px-6 py-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Import More
                  </button>

                  {/* Always show both buttons for debugging */}
                  <button
                    onClick={() => handleImport(false)}
                    className="px-6 py-3 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors"
                  >
                    Proceed with Full Import
                  </button>

                  <button
                    onClick={() => router.push('/movies')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Collection
                  </button>
                </div>

                {/* Debug info */}
                <div className="mt-4 text-xs text-muted-foreground">
                  Debug: isDryRun = {isDryRun.toString()}, currentStep = {currentStep}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-600 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Search TMDB for "{selectedFailedMovie?.Title}"</h2>
                <button
                  onClick={closeSearchModal}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movie title, TMDB ID, or paste TMDB URL..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyPress={(e) => e.key === 'Enter' && performTMDBSearch()}
                  />
                  <button
                    onClick={() => performTMDBSearch()}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Enhanced Search
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {searchMethod && (
                      <span className="text-muted-foreground">
                        Method: <span className="text-blue-400 capitalize">{searchMethod.replace('_', ' ')}</span>
                      </span>
                    )}
                    <a
                      href={`https://www.themoviedb.org/search/movie?query=${encodeURIComponent(searchQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Search on TMDB
                    </a>
                  </div>
                  <button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showAdvancedSearch ? 'Hide' : 'Show'} Tips
                  </button>
                </div>

                {showAdvancedSearch && (
                  <div className="bg-background/30 p-3 rounded border border-border/20 text-sm text-muted-foreground">
                    <div className="font-medium mb-2">Search Tips:</div>
                    <ul className="space-y-1 text-xs">
                      <li>• Paste TMDB URLs like: https://www.themoviedb.org/movie/947891-my-old-ass</li>
                      <li>• Use TMDB IDs directly: 947891</li>
                      <li>• Enhanced search tries multiple strategies automatically</li>
                      <li>• If no results, check the TMDB website link above</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex gap-3">
                        {movie.poster_path && (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{movie.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                            {movie.overview}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => selectMovieForImport(movie)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Import This
                            </button>
                            <a
                              href={`https://www.themoviedb.org/movie/${movie.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isSearching ? 'Searching...' : 'No movies found. Try a different search term.'}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a movie title and click Search to find matches on TMDB.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}