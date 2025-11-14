'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Edit, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface UserTableProps {
  users: UserData[];
  onEditUser: (user: UserData) => void;
  loading?: boolean;
}

type SortField = 'name' | 'email' | 'created_at' | 'last_login_at' | 'movies' | 'role';
type SortDirection = 'asc' | 'desc';

export function UserTable({ users, onEditUser, loading }: UserTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'last_login_at':
          aValue = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          bValue = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          break;
        case 'movies':
          aValue = a.stats.movies;
          bValue = b.stats.movies;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchQuery, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="p-4 bg-gray-800/50 animate-pulse">
          <div className="h-10 bg-gray-700 rounded w-full max-w-md"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-800/30 rounded animate-pulse"></div>
          ))}
        </div>
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
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
            <tr className="border-b border-gray-700">
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  User
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  Email
                  <SortIcon field="email" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  Role
                  <SortIcon field="role" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('movies')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  Movies
                  <SortIcon field="movies" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="text-sm font-semibold text-gray-300">Watchlist</div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="text-sm font-semibold text-gray-300">Vaults</div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('last_login_at')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  Last Active
                  <SortIcon field="last_login_at" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  Joined
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="text-sm font-semibold text-gray-300">Actions</div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800/30 divide-y divide-gray-700/30">
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  {searchQuery ? 'No users found matching your search' : 'No users yet'}
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {user.name || 'Unnamed User'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400 bg-gray-700/30 px-2 py-0.5 rounded">
                            User
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">
                      {user.stats.movies.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400">
                      {user.stats.watchlist.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400">
                      {user.stats.vaults.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-400">
                      {user.last_login_at
                        ? formatDistanceToNow(new Date(user.last_login_at), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEditUser(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700/50 text-sm text-gray-400">
        Showing {filteredAndSortedUsers.length} of {users.length} users
      </div>
    </div>
  );
}
