import React, { useState } from 'react';
import {
  Home,
  Users,
  GitBranch,
  Bot,
  MessageCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  HelpCircle,
  PanelLeftClose,
  Sparkles,
  Instagram,
  Radio,
  Plus,
  LogOut,
  Check,
} from 'lucide-react';
import { InstagramAccount, User } from '../../shared/types';

export type NavTab = 'home' | 'contacts' | 'automations' | 'ai' | 'inbox' | 'instagram' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  connectedAccount: InstagramAccount | null;
  currentUser?: User | null;
  onOpenTestModal: () => void;
  onDisconnectAccount?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  connectedAccount,
  currentUser,
  onOpenTestModal,
  onDisconnectAccount,
  onSignOut,
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
  }> = [
    { id: 'automations', label: 'Automation', icon: GitBranch },
    { id: 'instagram', label: 'Connect Instagram', icon: Instagram, highlight: true },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'ai', label: 'instaflow AI', icon: Bot },
    { id: 'inbox', label: 'Inbox', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
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

      {/* Account Selector Section - EMPTY BEFORE LOGIN, POPULATED AFTER REAL CONNECTION */}
      <div className="px-3 py-2 border-b border-slate-100">
        {!connectedAccount ? (
          /* Empty / Unconnected state */
          <button
            onClick={() => setActiveTab('instagram')}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-dashed border-slate-300 hover:border-[#0066ff] hover:bg-blue-50/40 transition-all text-left group cursor-pointer"
            title="Click to connect Instagram account"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 group-hover:border-[#0066ff] group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-[#0066ff] transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-700 group-hover:text-[#0066ff] truncate block">
                  + Add Account
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  No account linked
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0066ff] shrink-0 ml-1" />
          </button>
        ) : (
          /* Connected State: Shows Profile Picture, Handle, and Name */
          <div className="relative">
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-slate-200/90 transition-all text-left group cursor-pointer"
              title="Manage connected Instagram account"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Account Profile Picture */}
                <div className="relative shrink-0 w-8 h-8 rounded-full overflow-hidden border border-slate-200/80 shadow-2xs bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center text-white">
                  {connectedAccount.profilePictureUrl ? (
                    <img
                      src={connectedAccount.profilePictureUrl}
                      alt={connectedAccount.username}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase">
                      {(connectedAccount.name || connectedAccount.username || 'IG').slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {connectedAccount.name || connectedAccount.username}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    @{connectedAccount.username}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu when clicked */}
            {isAccountMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 bg-emerald-50 rounded-lg flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">@{connectedAccount.username}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">● Connected Account</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setActiveTab('instagram');
                  }}
                  className="w-full px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0066ff] rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add another account</span>
                </button>
                {onDisconnectAccount && (
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onDisconnectAccount();
                    }}
                    className="w-full px-2.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect @{connectedAccount.username}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
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
            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Test Simulator</span>
          </button>
        </div>
      </nav>

      {/* Bottom Footer Items */}
      <div className="p-3 border-t border-slate-100 space-y-1 text-slate-600 text-[13px]">
        {currentUser && (
          <div className="p-2 mb-1 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[11px] font-bold text-slate-800 truncate block">
                {currentUser.fullName || currentUser.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {currentUser.email}
              </span>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('instagram')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <UserIcon className="w-4 h-4 text-slate-500" />
          <span>My Profile</span>
        </button>

        <a
          href="https://help.manychat.com"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Help</span>
        </a>
      </div>
    </aside>
  );
};
