import React from 'react';
import {
  Home,
  Users,
  GitBranch,
  Bot,
  MessageCircle,
  Settings,
  ChevronDown,
  User,
  HelpCircle,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';
import { InstagramAccount } from '../../shared/types';

export type NavTab = 'home' | 'contacts' | 'automations' | 'ai' | 'inbox' | 'settings' | 'instagram';

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
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'contacts' as NavTab, label: 'Contacts', icon: Users },
    { id: 'automations' as NavTab, label: 'Automation', icon: GitBranch },
    { id: 'ai' as NavTab, label: 'instaflow AI', icon: Bot },
    { id: 'inbox' as NavTab, label: 'Inbox', icon: MessageCircle, badge: '1848' },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[220px] bg-white border-r border-[#e5e7eb] flex flex-col shrink-0 h-screen sticky top-0 select-none font-sans">
      {/* Brand Header: "instaflow" */}
      <div className="h-14 flex items-center px-4 pt-2">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('automations')}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-[21px] tracking-tight text-[#111827] lowercase">
            instaflow
          </span>
        </div>
      </div>

      {/* Account Selector Dropdown */}
      <div className="px-3 py-2 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('instagram')}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
          title="Manage connected Instagram account"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Account Avatar with PRO Badge */}
            <div className="relative shrink-0">
              {connectedAccount?.username === 'thevelocityexports' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  VE
                </div>
              ) : connectedAccount?.username === 'vajramakutajewellers' ? (
                <div className="w-8 h-8 rounded-full bg-[#0a180f] border-2 border-[#c5a059] flex flex-col items-center justify-center text-[7px] font-bold text-[#c5a059] leading-none shadow-xs">
                  <span>VAJRA</span>
                  <span>MAKUTA</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  {(connectedAccount?.name || connectedAccount?.username || 'IG').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-[#0066ff] text-white text-[8px] font-extrabold px-1 py-0.2 rounded-xs shadow-xs tracking-tighter">
                PRO
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-slate-800 truncate block">
                {connectedAccount?.name || 'Velocity Exports'}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                @{connectedAccount?.username || 'thevelocityexports'}
              </span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
        </button>
      </div>

      {/* Main Navigation Items */}
      <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#eef0f3] text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-[#0066ff] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Simulator Launcher */}
        <div className="pt-4 px-1">
          <button
            onClick={onOpenTestModal}
            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Test Simulator</span>
          </button>
        </div>
      </nav>

      {/* Bottom Footer Items */}
      <div className="p-3 border-t border-slate-100 space-y-1 text-slate-600 text-[13px]">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('instagram')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <User className="w-4 h-4 text-slate-500" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>Help</span>
        </button>
      </div>
    </aside>
  );
};
