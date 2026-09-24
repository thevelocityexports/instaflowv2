import React from 'react';
import {
  LayoutDashboard,
  Zap,
  MessageSquare,
  Instagram,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { InstagramAccount } from '../../shared/types';

export type NavTab = 'dashboard' | 'automations' | 'comments' | 'instagram' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  connectedAccount: InstagramAccount | null;
  onOpenTestModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  connectedAccount,
  onOpenTestModal,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'automations' as NavTab, label: 'Automations', icon: Zap },
    { id: 'comments' as NavTab, label: 'Comments', icon: MessageSquare },
    { id: 'instagram' as NavTab, label: 'Instagram', icon: Instagram },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-sm text-white font-bold text-sm">
            IF
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-slate-900 block leading-tight">
              InstaFlow
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Comment SaaS MVP</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Test Mode Quick Launcher Card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Test Simulator
            </span>
            <span className="text-[10px] font-mono text-slate-400">V1.0</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify keyword matching & auto-DM actions instantly without live Instagram comments.
          </p>
          <button
            onClick={onOpenTestModal}
            className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            Send Test Comment
          </button>
        </div>

        {/* Connected Instagram status badge */}
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="flex items-center gap-1.5 truncate">
            <Instagram className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate font-medium text-slate-700">
              {connectedAccount?.username ? `@${connectedAccount.username}` : 'No account'}
            </span>
          </span>
          <span className={`w-2 h-2 rounded-full ${connectedAccount?.isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        </div>
      </div>
    </aside>
  );
};
