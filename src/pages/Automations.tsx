import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Instagram,
} from 'lucide-react';
import { Automation, InstagramAccount } from '../../shared/types';

interface AutomationsProps {
  automations: Automation[];
  connectedAccount: InstagramAccount | null;
  onCreateNew: () => void;
  onEdit: (automation: Automation) => void;
  onToggle: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const Automations: React.FC<AutomationsProps> = ({
  automations,
  connectedAccount,
  onCreateNew,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const filteredAutomations = automations.filter((auto) => {
    const matchesSearch =
      auto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auto.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return auto.isActive;
    if (statusFilter === 'inactive') return !auto.isActive;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'No activity yet';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Automations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure comment keyword triggers and automated public replies or private DMs.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by automation name or keyword..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        {/* Status segmented filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({automations.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'active'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({automations.filter((a) => a.isActive).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive ({automations.filter((a) => !a.isActive).length})
          </button>
        </div>
      </div>

      {/* Automations Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredAutomations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No automations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? 'No automations match your search filter.'
                : 'Create your first comment automation to start replying and sending DMs automatically.'}
            </p>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Automation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Automation Name</th>
                  <th className="py-3.5 px-5">Account</th>
                  <th className="py-3.5 px-5">Keywords</th>
                  <th className="py-3.5 px-5">Configured Actions</th>
                  <th className="py-3.5 px-5">Created</th>
                  <th className="py-3.5 px-5">Last Activity</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAutomations.map((auto) => {
                  const hasPublicReply = auto.actions.some(
                    (a) => a.actionType === 'public_reply' && a.isEnabled
                  );
                  const hasPrivateDM = auto.actions.some(
                    (a) => a.actionType === 'private_dm' && a.isEnabled
                  );

                  return (
                    <tr
                      key={auto.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Enable/Disable Toggle */}
                      <td className="py-4 px-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={auto.isActive}
                            onChange={() => onToggle(auto.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>

                      {/* Name & Post target */}
                      <td className="py-4 px-5">
                        <button
                          onClick={() => onEdit(auto)}
                          className="font-bold text-slate-900 hover:text-rose-600 transition-colors text-left block text-xs"
                        >
                          {auto.name}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {auto.targetPostType === 'all'
                            ? 'All posts & reels'
                            : auto.targetPostCaption || 'Specific post'}
                        </span>
                      </td>

                      {/* Instagram Account */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Instagram className="w-3.5 h-3.5 text-rose-500" />
                          <span>@{connectedAccount?.username || 'vajramakutajewellers'}</span>
                        </div>
                      </td>

                      {/* Keywords */}
                      <td className="py-4 px-5 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {auto.keywords.slice(0, 3).map((kw) => (
                            <span
                              key={kw}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-mono rounded"
                            >
                              {kw}
                            </span>
                          ))}
                          {auto.keywords.length > 3 && (
                            <span className="px-1 py-0.5 text-slate-400 text-[10px]">
                              +{auto.keywords.length - 3}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium capitalize mt-0.5 block">
                          Mode: {auto.matchType}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          {hasPublicReply && (
                            <span
                              className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold flex items-center gap-1"
                              title="Public Comment Reply"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Public Reply
                            </span>
                          )}
                          {hasPrivateDM && (
                            <span
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold flex items-center gap-1"
                              title="Private Instagram DM"
                            >
                              <Send className="w-3 h-3" />
                              Private DM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(auto.createdAt)}
                      </td>

                      {/* Last Activity */}
                      <td className="py-4 px-5 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatTimeAgo(auto.lastActivityAt)}
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-5 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(auto)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicate(auto.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${auto.name}"?`)) {
                                onDelete(auto.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
