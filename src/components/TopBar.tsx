import React, { useState } from 'react';
import {
  Instagram,
  Sparkles,
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { InstagramAccount, User as UserType } from '../../shared/types';

interface TopBarProps {
  title: string;
  subtitle?: string;
  connectedAccount: InstagramAccount | null;
  currentUser: UserType | null;
  onOpenTestModal: () => void;
  onOpenMetaGuide?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  connectedAccount,
  currentUser,
  onOpenTestModal,
  onOpenMetaGuide,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && (
          <span className="text-xs text-slate-400 font-normal hidden sm:inline">
            · {subtitle}
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Connected Instagram Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <Instagram className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-slate-500">Connected:</span>
          <span className="font-semibold text-slate-900">
            {connectedAccount?.username ? `@${connectedAccount.username}` : 'Not connected'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connectedAccount?.isConnected ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Send Test Comment Button */}
        <button
          onClick={onOpenTestModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          Send Test Comment
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-600">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-30 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser?.fullName || 'Workspace Admin'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser?.email || 'admin@instaflow.app'}
                  </p>
                </div>

                <div className="px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Supabase Auth Active
                </div>

                {onOpenMetaGuide && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onOpenMetaGuide();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                  >
                    <Code2 className="w-3.5 h-3.5 text-slate-400" />
                    Meta Developer Config
                  </button>
                )}

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out / Reset Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
