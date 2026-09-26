import React, { useState, useEffect } from 'react';
import {
  Instagram,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Trash2,
  CheckCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { InstagramAccount } from '../../shared/types';
import { ApiClient } from '../services/api';

interface InstagramConnectionProps {
  connectedAccount: InstagramAccount | null;
  onDisconnect: (accountId?: string) => Promise<void>;
  onRefresh: () => void;
}

export const InstagramConnection: React.FC<InstagramConnectionProps> = ({
  connectedAccount,
  onDisconnect,
  onRefresh,
}) => {
  const [allAccounts, setAllAccounts] = useState<InstagramAccount[]>([]);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [connectResult, setConnectResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Media Sync & Reel Import State
  const [isSyncingMedia, setIsSyncingMedia] = useState(false);
  const [syncMediaStatus, setSyncMediaStatus] = useState<string | null>(null);
  const [importReelUrl, setImportReelUrl] = useState('');
  const [isImportingReel, setIsImportingReel] = useState(false);
  const [importReelResult, setImportReelResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAccounts = () => {
    ApiClient.getInstagramAccounts()
      .then((res) => {
        setAllAccounts(res.accounts || []);
      })
      .catch((err) => console.error('Failed to load accounts list', err));
  };

  useEffect(() => {
    fetchAccounts();

    // Check query params for OAuth result
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorMsg = urlParams.get('error') || urlParams.get('meta_error');
      const isConnected = urlParams.get('connected');

      if (errorMsg) {
        setConnectResult({
          type: 'error',
          text: decodeURIComponent(errorMsg),
        });
      } else if (isConnected === 'true') {
        setConnectResult({
          type: 'success',
          text: '✓ Instagram account connected successfully!',
        });
      }
    }
  }, []);

  /**
   * Initiates the Direct Instagram Login OAuth flow:
   * GET /api/instagram/connect
   * which redirects to:
   * https://api.instagram.com/oauth/authorize
   */
  const handleConnectInstagram = () => {
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      '/api/instagram/connect',
      'instagram_oauth_popup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // If popup was blocked by browser, redirect current window
      window.location.href = '/api/instagram/connect';
      return;
    }

    // Listen for postMessage from popup when OAuth finishes
    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INSTAGRAM_CONNECTED') {
        window.removeEventListener('message', messageListener);
        setConnectResult({
          type: 'success',
          text: `✓ Instagram account @${event.data.account?.username || 'user'} connected successfully!`,
        });
        onRefresh();
        fetchAccounts();
      }
    };
    window.addEventListener('message', messageListener);
  };

  const handleSyncMedia = async () => {
    setIsSyncingMedia(true);
    setSyncMediaStatus(null);
    try {
      const res = await ApiClient.getInstagramMedia(connectedAccount?.id);
      if (res && res.media) {
        setSyncMediaStatus(`✓ Synchronized ${res.media.length} reels & posts from Instagram!`);
        try {
          if (res.media.length > 0) {
            localStorage.setItem('instaflow_active_reels', JSON.stringify(res.media));
            if (connectedAccount?.username) {
              localStorage.setItem(`instaflow_media_${connectedAccount.username}`, JSON.stringify(res.media));
            }
          }
        } catch {}
        onRefresh();
      } else {
        setSyncMediaStatus(res?.message || 'Sync completed.');
      }
    } catch (err: any) {
      setSyncMediaStatus(`Sync notice: ${err?.message || 'Failed to sync'}`);
    } finally {
      setIsSyncingMedia(false);
    }
  };

  const handleImportReel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importReelUrl.trim()) return;
    setIsImportingReel(true);
    setImportReelResult(null);
    try {
      const res = await ApiClient.importInstagramReel({ reelUrl: importReelUrl.trim() });
      if (res.success) {
        setImportReelResult({ type: 'success', text: `✓ Imported Reel from Instagram! Total reels: ${res.totalMedia}` });
        setImportReelUrl('');
        try {
          if (res.media && res.media.length > 0) {
            localStorage.setItem('instaflow_active_reels', JSON.stringify(res.media));
            if (connectedAccount?.username) {
              localStorage.setItem(`instaflow_media_${connectedAccount.username}`, JSON.stringify(res.media));
            }
          }
        } catch {}
        onRefresh();
      } else {
        setImportReelResult({ type: 'error', text: res.message || 'Failed to import reel' });
      }
    } catch (err: any) {
      setImportReelResult({ type: 'error', text: err?.message || 'Failed to import reel' });
    } finally {
      setIsImportingReel(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this Instagram account?')) return;
    try {
      await ApiClient.deleteInstagramAccount(accountId);
      setConnectResult({ type: 'success', text: 'Account deleted successfully.' });
      onRefresh();
      fetchAccounts();
    } catch (err: any) {
      setConnectResult({ type: 'error', text: err?.message || 'Failed to delete account' });
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    setIsSwitching(accountId);
    try {
      const res = await ApiClient.switchInstagramAccount(accountId);
      setConnectResult({ type: 'success', text: `Switched active account to @${res.account.username}` });
      onRefresh();
      fetchAccounts();
    } catch (err: any) {
      setConnectResult({ type: 'error', text: err.message || 'Failed to switch account' });
    } finally {
      setIsSwitching(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name?: string, username?: string) => {
    const text = name || username || 'IG';
    const parts = text.split(' ').filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Instagram Connection</h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your Instagram account to authorize automated comment replies and direct message flows.
        </p>
      </div>

      {/* Result Alert */}
      {connectResult && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            connectResult.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {connectResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{connectResult.text}</span>
          </div>
          <button
            onClick={() => setConnectResult(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Account Card */}
      {connectedAccount?.isConnected ? (
        /* Connected State */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Instagram Account Integration</h3>
                <p className="text-xs text-slate-400">Direct Instagram Login & Automation Engine</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected & Active
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-xs shrink-0">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-sm font-bold text-slate-900 uppercase">
                    {getInitials(connectedAccount.name, connectedAccount.username)}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">
                      @{connectedAccount.username}
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {connectedAccount.name || 'Instagram Account'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    ID: <span className="font-mono">{connectedAccount.instagramUserId}</span> • Connected on: {formatDate(connectedAccount.connectedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleConnectInstagram}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Connect Another Account</span>
                </button>
                <button
                  type="button"
                  disabled={isDisconnecting}
                  onClick={async () => {
                    if (confirm('Are you sure you want to disconnect this Instagram account? Active automations will be paused.')) {
                      setIsDisconnecting(true);
                      await onDisconnect(connectedAccount.id);
                      fetchAccounts();
                      setIsDisconnecting(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>

            {/* Account Health & Reels Sync */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">
                      Live Instagram Synchronization & Automation Engine
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Account authenticated via Instagram Login. Automated comment replies and DMs are ready.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncingMedia}
                    onClick={handleSyncMedia}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMedia ? 'animate-spin' : ''}`} />
                    <span>{isSyncingMedia ? 'Syncing...' : 'Sync Live Reels'}</span>
                  </button>
                </div>
              </div>

              {syncMediaStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                  {syncMediaStatus}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Comment Listener</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Auto-DM Engine</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                    Ready
                  </span>
                </div>
              </div>

              {/* Import Real Instagram Reel Tool */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Import Reel by URL directly to your account
                  </label>
                  <span className="text-[10px] text-slate-400">Paste any Instagram reel link</span>
                </div>
                
                {importReelResult && (
                  <div className={`p-2.5 rounded-lg text-xs font-medium ${importReelResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {importReelResult.text}
                  </div>
                )}

                <form onSubmit={handleImportReel} className="flex gap-2">
                  <input
                    type="url"
                    value={importReelUrl}
                    onChange={(e) => setImportReelUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/C8_example/ or post URL"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                  />
                  <button
                    type="submit"
                    disabled={isImportingReel || !importReelUrl.trim()}
                    className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isImportingReel ? 'Importing...' : 'Import Reel'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected State - Simplified Single Connection Experience */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-10 text-center space-y-6 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md mx-auto">
            <Instagram className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Instagram</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Connect your Instagram account to use Instagram automation.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConnectInstagram}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Instagram className="w-4 h-4" />
              <span>Connect Instagram</span>
            </button>
          </div>
        </div>
      )}

      {/* Connected Accounts Manager (Only shown if accounts exist) */}
      {allAccounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connected Accounts</h3>
              <p className="text-xs text-slate-500">Manage and switch between your connected Instagram accounts</p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {allAccounts.length} {allAccounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {allAccounts.map((acc) => {
              const isActive = acc.isConnected;
              return (
                <div
                  key={acc.id}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    isActive ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shrink-0">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-900">
                        {getInitials(acc.name, acc.username)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">@{acc.username}</span>
                        {isActive && (
                          <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{acc.name || acc.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isSwitching === acc.id}
                        onClick={() => handleSwitchAccount(acc.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSwitching === acc.id ? 'animate-spin' : ''}`} />
                        {isSwitching === acc.id ? 'Switching...' : 'Switch to this'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      title="Delete account"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
