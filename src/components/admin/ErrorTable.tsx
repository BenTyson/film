'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ChevronDown, ChevronUp, Search, Code, User } from 'lucide-react';

interface ErrorLog {
  id: number;
  endpoint: string;
  method: string;
  status_code: number;
  error_message: string;
  stack_trace: string | null;
  created_at: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

interface ErrorTableProps {
  errors: ErrorLog[];
  loading?: boolean;
}

const STATUS_COLOR: Record<number, string> = {
  400: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  401: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  403: 'bg-red-500/10 text-red-400 border-red-500/30',
  404: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  500: 'bg-red-500/10 text-red-400 border-red-500/30',
  503: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export function ErrorTable({ errors, loading }: ErrorTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredErrors = useMemo(() => {
    if (!searchQuery) return errors;

    return errors.filter(
      (error) =>
        error.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [errors, searchQuery]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getStatusColor = (statusCode: number) => {
    const baseCode = Math.floor(statusCode / 100) * 100;
    return STATUS_COLOR[statusCode] || STATUS_COLOR[baseCode] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-800/30 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700/50 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No errors logged yet</p>
        <p className="text-sm text-gray-500 mt-1">Errors will appear here when they occur</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Search Bar */}
      <div className="p-4 bg-gray-800/50 border-b border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search errors by endpoint, message, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Error List */}
      <div className="divide-y divide-gray-700/30">
        {filteredErrors.map((error) => {
          const isExpanded = expandedIds.has(error.id);

          return (
            <div
              key={error.id}
              className="p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(
                        error.status_code
                      )}`}
                    >
                      {error.status_code}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs font-mono">
                      {error.method}
                    </span>
                    <code className="text-sm text-gray-300 truncate">{error.endpoint}</code>
                  </div>

                  {/* Error Message */}
                  <p className="text-white mb-2">{error.error_message}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {error.user?.name || error.user?.email || 'Anonymous'}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Stack Trace (Expanded) */}
                  {isExpanded && error.stack_trace && (
                    <div className="mt-3 p-3 bg-gray-900/70 rounded border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-400 font-medium">Stack Trace:</p>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">
                        {error.stack_trace}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Expand Button */}
                {error.stack_trace && (
                  <button
                    onClick={() => toggleExpand(error.id)}
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Results count */}
      <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700/50 text-sm text-gray-400">
        Showing {filteredErrors.length} of {errors.length} errors
      </div>
    </div>
  );
}
