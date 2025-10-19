'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Loader2, Trash2 } from 'lucide-react';
import type { Vault } from '@/types/vault';

interface EditVaultModalProps {
  vault: Vault | null;
  isOpen: boolean;
  onClose: () => void;
  onVaultUpdated: () => void;
  onVaultDeleted?: () => void;
}

export function EditVaultModal({
  vault,
  isOpen,
  onClose,
  onVaultUpdated,
  onVaultDeleted,
}: EditVaultModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (vault) {
      setName(vault.name);
      setDescription(vault.description || '');
    }
  }, [vault]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vault) return;

    setError(null);

    if (!name.trim()) {
      setError('Vault name is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/vaults/${vault.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onVaultUpdated();
        onClose();
        setError(null);
        setShowDeleteConfirm(false);
      } else {
        setError(data.error || 'Failed to update vault');
      }
    } catch (err) {
      console.error('Error updating vault:', err);
      setError('Failed to update vault');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vault) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/vaults/${vault.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        onVaultDeleted?.();
        onClose();
        setShowDeleteConfirm(false);
      } else {
        setError(data.error || 'Failed to delete vault');
      }
    } catch (err) {
      console.error('Error deleting vault:', err);
      setError('Failed to delete vault');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!loading && !deleting) {
      onClose();
      setError(null);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !vault) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg">
                <Edit className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit Vault</h2>
                <p className="text-sm text-gray-400">Update vault details</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading || deleting}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-gray-300 mb-2">
                Vault Name <span className="text-red-500">*</span>
              </label>
              <input
                id="vault-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Best Action Films of All Time"
                disabled={loading || deleting}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-500 disabled:opacity-50"
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="vault-description" className="block text-sm font-medium text-gray-300 mb-2">
                Description <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <textarea
                id="vault-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this vault..."
                disabled={loading || deleting}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-500 resize-none disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg space-y-3">
                <p className="text-sm text-red-400 font-medium">
                  Are you sure you want to delete this vault? This will remove all movies from the vault.
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {!showDeleteConfirm && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading || deleting}
                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading || deleting}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || deleting || !name.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
