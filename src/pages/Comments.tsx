import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Instagram,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';
import { ExecutionLog } from '../../shared/types';

interface CommentsProps {
  comments: ExecutionLog[];
  onOpenTestModal: () => void;
  isLoading?: boolean;
}

export const Comments: React.FC<CommentsProps> = ({ comments, onOpenTestModal, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'skipped'>('all');
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);

  const filteredComments = comments.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      c.username.toLowerCase().includes(searchLower) ||
      c.commentText.toLowerCase().includes(searchLower) ||
      (c.matchedKeyword && c.matchedKeyword.toLowerCase().includes(searchLower)) ||
      (c.automationName && c.automationName.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return c.actionStatus === statusFilter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Comments & Execution Logs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed of all received Instagram comments, keyword matches, and auto-reply actions.
          </p>
        </div>

        <button
          onClick={onOpenTestModal}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          Send Test Comment
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
            placeholder="Search username, comment text, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'success'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Successful ({comments.filter((c) => c.actionStatus === 'success').length})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'failed'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Failed ({comments.filter((c) => c.actionStatus === 'failed').length})
          </button>
          <button
            onClick={() => setStatusFilter('skipped')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'skipped'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            No Match / Skipped ({comments.filter((c) => c.actionStatus === 'skipped').length})
          </button>
        </div>
      </div>

      {/* Comments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredComments.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No comment records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Comments received via webhooks or test simulator will automatically be logged here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Instagram User</th>
                  <th className="py-3.5 px-5">Comment Text</th>
                  <th className="py-3.5 px-5">Post / Reel</th>
                  <th className="py-3.5 px-5">Matched Automation</th>
                  <th className="py-3.5 px-5">Keyword</th>
                  <th className="py-3.5 px-5">Action Type</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComments.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    {/* Username */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {log.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            @{log.username}
                          </span>
                          {log.isTestEvent && (
                            <span className="text-[9px] font-mono text-amber-600 uppercase font-semibold">
                              TEST MODE
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Comment text */}
                    <td className="py-4 px-5 max-w-xs font-medium text-slate-900">
                      <p className="truncate">"{log.commentText}"</p>
                    </td>

                    {/* Post / Reel */}
                    <td className="py-4 px-5 text-slate-500 font-mono text-[11px]">
                      {log.postId ? log.postId.replace('post_', '') : 'General Post'}
                    </td>

                    {/* Matched automation */}
                    <td className="py-4 px-5">
                      <span className="font-semibold text-slate-800">
                        {log.automationName || '—'}
                      </span>
                    </td>

                    {/* Matched keyword */}
                    <td className="py-4 px-5">
                      {log.matchedKeyword ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-mono font-bold text-[10px]">
                          {log.matchedKeyword}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5">
                      <span className="font-medium text-slate-700">
                        {log.actionType === 'public_reply'
                          ? '💬 Public Reply'
                          : log.actionType === 'private_dm'
                          ? '✉️ Private DM'
                          : log.actionType === 'duplicate_ignored'
                          ? 'Idempotency Skip'
                          : 'No Keyword Match'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.actionStatus === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.actionStatus === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {log.actionStatus === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : log.actionStatus === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {log.actionStatus.toUpperCase()}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>

                    {/* View Details */}
                    <td className="py-4 px-5 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Inspection Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Execution Audit Log</h3>
                <span className="font-mono text-[11px] text-slate-400">ID: {selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instagram User:</span>
                  <span className="font-bold text-slate-900">@{selectedLog.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Comment Text:</span>
                  <span className="font-medium text-slate-800">"{selectedLog.commentText}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Comment ID:</span>
                  <span className="font-mono text-slate-700">{selectedLog.commentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">
                    {selectedLog.actionStatus}
                  </span>
                </div>
                {selectedLog.matchedKeyword && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Matched Keyword:</span>
                    <span className="font-mono font-bold text-rose-600">
                      {selectedLog.matchedKeyword}
                    </span>
                  </div>
                )}
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  <span className="font-bold block mb-0.5">Error Detail:</span>
                  {selectedLog.errorMessage}
                </div>
              )}

              {selectedLog.metaResponse && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Meta Graph API Response (Sanitized)
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.metaResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
