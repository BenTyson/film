'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Film,
  Upload,
  Heart,
  Archive,
  Tag,
  Trash2,
  Edit,
  User,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Activity {
  id: number;
  action_type: string;
  target_type: string | null;
  target_id: number | null;
  metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_ICONS: Record<string, any> = {
  movie_added: Film,
  movie_updated: Edit,
  movie_removed: Trash2,
  csv_import: Upload,
  watchlist_added: Heart,
  watchlist_removed: Trash2,
  vault_created: Archive,
  vault_updated: Edit,
  vault_deleted: Trash2,
  vault_movie_added: Film,
  vault_movie_removed: Trash2,
  tag_created: Tag,
  movie_tagged: Tag,
  user_login: User,
};

const ACTION_COLORS: Record<string, string> = {
  movie_added: 'text-green-400 bg-green-500/10 border-green-500/30',
  movie_updated: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  movie_removed: 'text-red-400 bg-red-500/10 border-red-500/30',
  csv_import: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  watchlist_added: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  watchlist_removed: 'text-red-400 bg-red-500/10 border-red-500/30',
  vault_created: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  vault_updated: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  vault_deleted: 'text-red-400 bg-red-500/10 border-red-500/30',
  vault_movie_added: 'text-green-400 bg-green-500/10 border-green-500/30',
  vault_movie_removed: 'text-red-400 bg-red-500/10 border-red-500/30',
  tag_created: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  movie_tagged: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  user_login: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function getActionDescription(activity: Activity): string {
  const { action_type, metadata } = activity;

  switch (action_type) {
    case 'movie_added':
      return `added "${metadata?.title || 'a movie'}" to their collection`;
    case 'movie_updated':
      return `updated "${metadata?.title || 'a movie'}"`;
    case 'movie_removed':
      return `removed "${metadata?.title || 'a movie'}" from collection`;
    case 'csv_import':
      return `imported ${metadata?.count || 0} movies from CSV`;
    case 'watchlist_added':
      return `added "${metadata?.title || 'a movie'}" to watchlist`;
    case 'watchlist_removed':
      return `removed "${metadata?.title || 'a movie'}" from watchlist`;
    case 'vault_created':
      return `created vault "${metadata?.name || 'Untitled'}"`;
    case 'vault_updated':
      return `updated vault "${metadata?.name || 'a vault'}"`;
    case 'vault_deleted':
      return `deleted vault "${metadata?.name || 'a vault'}"`;
    case 'vault_movie_added':
      return `added "${metadata?.title || 'a movie'}" to vault`;
    case 'vault_movie_removed':
      return `removed "${metadata?.title || 'a movie'}" from vault`;
    case 'tag_created':
      return `created tag "${metadata?.name || 'a tag'}"`;
    case 'movie_tagged':
      return `tagged "${metadata?.title || 'a movie'}" with "${metadata?.tag || 'a tag'}"`;
    case 'user_login':
      return 'logged in';
    default:
      return action_type.replace(/_/g, ' ');
  }
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredActivities = useMemo(() => {
    if (!searchQuery) return activities;

    return activities.filter(
      (activity) =>
        activity.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getActionDescription(activity).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activities, searchQuery]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-gray-800/30 rounded-lg animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* Activity Timeline */}
      <div className="space-y-3">
        {filteredActivities.map((activity) => {
          const Icon = ACTION_ICONS[activity.action_type] || Film;
          const colorClass = ACTION_COLORS[activity.action_type] || ACTION_COLORS.movie_added;
          const isExpanded = expandedIds.has(activity.id);
          const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0;

          return (
            <div
              key={activity.id}
              className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white">
                        <span className="font-medium">{activity.user.name || 'Unknown User'}</span>
                        <span className="text-gray-400"> {getActionDescription(activity)}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Expand button */}
                    {hasMetadata && (
                      <button
                        onClick={() => toggleExpand(activity.id)}
                        className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded metadata */}
                  {isExpanded && hasMetadata && (
                    <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700/50">
                      <p className="text-xs text-gray-400 mb-2 font-medium">Details:</p>
                      <pre className="text-xs text-gray-300 overflow-x-auto">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredActivities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No activities found matching &ldquo;{searchQuery}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
