import React from 'react';
import {
  Zap,
  CheckCircle,
  MessageSquare,
  Send,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Instagram,
  RefreshCw,
} from 'lucide-react';
import { DashboardStats, ExecutionLog, InstagramAccount } from '../../shared/types';

interface DashboardProps {
  stats: DashboardStats | null;
  recentActivity: ExecutionLog[];
  connectedAccount: InstagramAccount | null;
  onOpenTestModal: () => void;
  onCreateAutomation: () => void;
  onViewComments: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  recentActivity,
  connectedAccount,
  onOpenTestModal,
  onCreateAutomation,
  onViewComments,
  onRefresh,
  isLoading,
}) => {
  const statCards = [
    {
      title: 'Total Automations',
      value: stats?.totalAutomations ?? 0,
      icon: Zap,
      color: 'text-slate-900',
      bg: 'bg-slate-50',
    },
    {
      title: 'Active Automations',
      value: stats?.activeAutomations ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/60',
    },
    {
      title: 'Comments Processed',
      value: stats?.commentsProcessed ?? 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50/60',
    },
    {
      title: 'Successful Replies',
      value: stats?.successfulReplies ?? 0,
      icon: Send,
      color: 'text-purple-600',
      bg: 'bg-purple-50/60',
    },
    {
      title: 'Successful DMs',
      value: stats?.successfulDMs ?? 0,
      icon: Sparkles,
      color: 'text-rose-600',
      bg: 'bg-rose-50/60',
    },
  ];

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back to InstaFlow
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ENGINE ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automating comment responses and instant DMs for{' '}
            <span className="font-semibold text-slate-700">
              {connectedAccount ? `@${connectedAccount.username}` : 'your Instagram account'}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenTestModal}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            Send Test Comment
          </button>
          <button
            onClick={onCreateAutomation}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            New Automation
          </button>
        </div>
      </div>

      {/* 5 Core Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 truncate">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h3>
              <p className="text-xs text-slate-400">Real-time comment executions & actions</p>
            </div>
            <button
              onClick={onViewComments}
              className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline"
            >
              View All
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No recent activity yet. Send a test comment to see live execution!
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        @{activity.username}
                      </span>
                      {activity.isTestEvent && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-mono font-bold rounded">
                          TEST MODE
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">· {formatTimeAgo(activity.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      "{activity.commentText}"
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="text-slate-400 font-medium">Auto:</span>
                      <span className="text-slate-700 font-semibold">
                        {activity.automationName || 'Default Keyword Engine'}
                      </span>
                      {activity.matchedKeyword && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-rose-600 bg-rose-50 px-1 rounded text-[10px]">
                            [{activity.matchedKeyword}]
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activity.actionStatus === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : activity.actionStatus === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {activity.actionType === 'public_reply'
                        ? 'Public Reply Sent'
                        : activity.actionType === 'private_dm'
                        ? 'DM Sent'
                        : activity.actionType === 'duplicate_ignored'
                        ? 'Duplicate Ignored'
                        : 'No Match'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {activity.actionStatus.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Integration Status & Quick Guide (1 col) */}
        <div className="space-y-6">
          {/* Instagram Connection Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connected Account
            </h3>

            {connectedAccount ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-xs text-slate-800">
                    VM
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-slate-900 truncate">
                    @{connectedAccount.username}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Webhooks & Graph API Active
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                <p className="font-semibold">Instagram Not Connected</p>
                <p className="text-amber-700">
                  Connect your Instagram Creator/Business account to start automating live comments.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Webhook Ingestion</span>
                <span className="font-mono text-[11px] text-emerald-600 font-semibold">200 OK</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Idempotency Guard</span>
                <span className="font-mono text-[11px] text-emerald-600 font-semibold">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Database Engine</span>
                <span className="font-mono text-[11px] text-slate-800 font-medium">Supabase / SQLite</span>
              </div>
            </div>
          </div>

          {/* Workflow Reminder Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Core V1 Workflow
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Instagram Comment <span className="text-rose-400">→</span> Keyword Match{' '}
              <span className="text-rose-400">→</span> Public Comment Reply & Instant Private DM.
            </p>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-300 space-y-1 font-mono">
              <div className="text-slate-400">Sample comment:</div>
              <div className="text-emerald-400">"PRICE PLEASE"</div>
              <div className="text-slate-400 pt-1">Automated response:</div>
              <div className="text-slate-200">Public Reply: "Check DM 👋"</div>
              <div className="text-slate-200">Private DM: "Here is the link: https://..."</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
