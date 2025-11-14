'use client';

import { AlertCircle, TrendingUp, TrendingDown, Minus, Clock, Bug } from 'lucide-react';

interface ErrorStats {
  counts: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
    total: number;
  };
  trend: {
    error_rate_change_24h: number;
    direction: 'increasing' | 'decreasing' | 'stable';
  };
}

interface ErrorStatsCardsProps {
  stats: ErrorStats | null;
  loading?: boolean;
}

export function ErrorStatsCards({ stats, loading }: ErrorStatsCardsProps) {
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

  const getTrendIcon = () => {
    switch (stats.trend.direction) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    switch (stats.trend.direction) {
      case 'increasing':
        return 'text-red-400';
      case 'decreasing':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendText = () => {
    const change = Math.abs(stats.trend.error_rate_change_24h);
    if (change < 1) return 'Stable';
    return `${stats.trend.direction === 'increasing' ? '+' : '-'}${change.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Last 24 Hours */}
      <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-400 font-medium">Last 24h</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.counts.last_24h}</p>
        <div className={`flex items-center gap-1 mt-1 text-xs ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{getTrendText()}</span>
        </div>
      </div>

      {/* Last 7 Days */}
      <div className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-lg border border-orange-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Bug className="w-4 h-4 text-orange-400" />
          <p className="text-xs text-orange-400 font-medium">Last 7d</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.counts.last_7d}</p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.counts.last_7d > 0
            ? (stats.counts.last_7d / 7).toFixed(1)
            : 0} per day
        </p>
      </div>

      {/* Last 30 Days */}
      <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <p className="text-xs text-yellow-400 font-medium">Last 30d</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.counts.last_30d}</p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.counts.last_30d > 0
            ? (stats.counts.last_30d / 30).toFixed(1)
            : 0} per day
        </p>
      </div>

      {/* Total Errors */}
      <div className="p-4 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-lg border border-gray-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Bug className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-400 font-medium">Total Errors</p>
        </div>
        <p className="text-3xl font-bold text-white">{stats.counts.total.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-1">All time</p>
      </div>
    </div>
  );
}
