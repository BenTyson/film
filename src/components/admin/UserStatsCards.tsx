'use client';

import { Users, Film, Clock, TrendingUp } from 'lucide-react';

interface Stats {
  users: {
    total: number;
    new_this_month: number;
    active_this_week: number;
  };
  content: {
    total_movies: number;
    total_watchlist_items: number;
    total_vaults: number;
    total_tags: number;
    avg_collection_size: number;
  };
  oscars: {
    total_movies: number;
    total_nominations: number;
  };
}

interface UserStatsCardsProps {
  stats: Stats | null;
  loading?: boolean;
}

export function UserStatsCards({ stats, loading }: UserStatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 animate-pulse"
          >
            <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Users */}
      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-blue-400 font-medium">Total Users</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.users.total}</p>
        <p className="text-xs text-gray-400 mt-1">
          +{stats.users.new_this_month} this month
        </p>
      </div>

      {/* Active This Week */}
      <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-green-400" />
          <p className="text-xs text-green-400 font-medium">Active (7d)</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.users.active_this_week}</p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.users.total > 0
            ? Math.round((stats.users.active_this_week / stats.users.total) * 100)
            : 0}% of users
        </p>
      </div>

      {/* Total Movies Tracked */}
      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Film className="w-4 h-4 text-purple-400" />
          <p className="text-xs text-purple-400 font-medium">Movies Tracked</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.content.total_movies.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.content.avg_collection_size} avg/user
        </p>
      </div>

      {/* Watchlist Items */}
      <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/30">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <p className="text-xs text-orange-400 font-medium">Watchlist Items</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.content.total_watchlist_items.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.content.total_vaults} vaults
        </p>
      </div>
    </div>
  );
}
