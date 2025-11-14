'use client';

import { useState } from 'react';
import { X, Shield, User, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserData {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  role: string;
  stats: {
    movies: number;
    watchlist: number;
    vaults: number;
    tags: number;
  };
}

interface EditUserModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: number, updates: { role?: string; name?: string }) => Promise<void>;
}

export function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [role, setRole] = useState(user?.role || 'user');
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when user changes
  if (user && (role !== user.role || name !== user.name)) {
    setRole(user.role);
    setName(user.name || '');
  }

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const updates: { role?: string; name?: string } = {};
      if (role !== user.role) updates.role = role;
      if (name !== user.name) updates.name = name;

      await onSave(user.id, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      onClose();
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div
                className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit User</h2>
                    <p className="text-sm text-gray-400 mt-1">{user.email}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    disabled={saving}
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Error message */}
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {/* User Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Movies</p>
                      <p className="text-lg font-bold text-white">{user.stats.movies}</p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Watchlist</p>
                      <p className="text-lg font-bold text-white">{user.stats.watchlist}</p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Vaults</p>
                      <p className="text-lg font-bold text-white">{user.stats.vaults}</p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Tags</p>
                      <p className="text-lg font-bold text-white">{user.stats.tags}</p>
                    </div>
                  </div>

                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="User's name"
                      disabled={saving}
                    />
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      User Role
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* User Role */}
                      <button
                        onClick={() => setRole('user')}
                        disabled={saving}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          role === 'user'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              role === 'user'
                                ? 'bg-blue-500/20'
                                : 'bg-gray-700/50'
                            }`}
                          >
                            <User className="w-6 h-6 text-gray-300" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">User</p>
                            <p className="text-xs text-gray-400">Standard access</p>
                          </div>
                        </div>
                      </button>

                      {/* Admin Role */}
                      <button
                        onClick={() => setRole('admin')}
                        disabled={saving}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          role === 'admin'
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              role === 'admin'
                                ? 'bg-yellow-500/20'
                                : 'bg-gray-700/50'
                            }`}
                          >
                            <Shield className="w-6 h-6 text-yellow-500" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">Admin</p>
                            <p className="text-xs text-gray-400">Full access</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      Admins have access to the admin dashboard and can manage other users.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
                  <button
                    onClick={handleClose}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
