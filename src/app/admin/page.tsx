'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Home,
  Award,
  Film,
  Archive,
  Plus,
  Shield,
  RefreshCw,
  AlertCircle,
  Users,
  Activity,
  Bug,
} from 'lucide-react';
import { UserStatsCards } from '@/components/admin/UserStatsCards';
import { UserTable } from '@/components/admin/UserTable';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { ErrorStatsCards } from '@/components/admin/ErrorStatsCards';
import { ErrorTable } from '@/components/admin/ErrorTable';

interface UserData {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  role: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  stats: {
    movies: number;
    watchlist: number;
    vaults: number;
    tags: number;
  };
}

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

interface ActivityLog {
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

type TabType = 'users' | 'activity' | 'errors';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, statsRes, activityRes, errorsRes, errorStatsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/activity?limit=50'),
        fetch('/api/admin/errors?limit=50'),
        fetch('/api/admin/errors/stats'),
      ]);

      if (!usersRes.ok || !statsRes.ok || !activityRes.ok || !errorsRes.ok || !errorStatsRes.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const [usersData, statsData, activityData, errorsData, errorStatsData] = await Promise.all([
        usersRes.json(),
        statsRes.json(),
        activityRes.json(),
        errorsRes.json(),
        errorStatsRes.json(),
      ]);

      if (!usersData.success || !statsData.success || !activityData.success || !errorsData.success || !errorStatsData.success) {
        throw new Error('Failed to load data');
      }

      setUsers(usersData.data);
      setStats(statsData.data);
      setActivities(activityData.data.activities);
      setErrors(errorsData.data.errors);
      setErrorStats(errorStatsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (
    userId: number,
    updates: { role?: string; name?: string }
  ) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update user');
    }

    // Refresh data
    await fetchData();
  };

  const navItems = [
    { href: '/', label: 'Collection', icon: Home },
    { href: '/oscars', label: 'Oscars', icon: Award },
    { href: '/watchlist', label: 'Watchlist', icon: Film },
    { href: '/vaults', label: 'Vaults', icon: Archive },
    { href: '/add', label: 'Add', icon: Plus },
    { href: '/admin', label: 'Admin', icon: Shield, isActive: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Cinematekka
              </h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        item.isActive
                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border border-blue-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
              </div>
              <p className="text-gray-400">
                Manage users and monitor system health
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error loading admin data</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'users'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'activity'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'errors'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bug className="w-4 h-4" />
              Errors
              {errorStats && errorStats.counts.last_24h > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                  {errorStats.counts.last_24h}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="mb-8">
              <UserStatsCards stats={stats} loading={loading} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-4">All Users</h3>
              <UserTable
                users={users}
                onEditUser={handleEditUser}
                loading={loading}
              />
            </div>
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
            <ActivityFeed activities={activities} loading={loading} />
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <>
            <div className="mb-8">
              <ErrorStatsCards stats={errorStats} loading={loading} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Error Logs</h3>
              <ErrorTable errors={errors} loading={loading} />
            </div>
          </>
        )}
      </main>

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />
    </div>
  );
}
