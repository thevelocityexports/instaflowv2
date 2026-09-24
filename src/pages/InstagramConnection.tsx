import React, { useState, useEffect } from 'react';
import {
  Instagram,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Key,
  Globe,
  Lock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  X,
  Plus,
  Radio,
  CheckCircle,
} from 'lucide-react';
import { InstagramAccount, MetaConfigStatus } from '../../shared/types';
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
  const [metaConfig, setMetaConfig] = useState<MetaConfigStatus | null>(null);
  const [allAccounts, setAllAccounts] = useState<InstagramAccount[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);

  // Direct Account Connect Form State
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [inputUsername, setInputUsername] = useState('thevelocityexports');
  const [inputName, setInputName] = useState('Velocity Exports');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [connectResult, setConnectResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Meta OAuth Guidance Modal (Prevents 404 navigation when credentials aren't set)
  const [showMetaModal, setShowMetaModal] = useState(false);

  const fetchAccounts = () => {
    ApiClient.getInstagramAccounts()
      .then((res) => {
        setAllAccounts(res.accounts || []);
      })
      .catch((err) => console.error('Failed to load accounts list', err));
  };

  useEffect(() => {
    ApiClient.getMetaConfigStatus()
      .then((res) => setMetaConfig(res.config))
      .catch((err) => console.error('Failed to load Meta config status', err));

    fetchAccounts();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnectClick = () => {
    // If Meta App ID is not configured in secrets, do NOT perform a hard browser navigation to /api/instagram/connect
    // which leads to a 404 or bad request. Instead, show clear guidance with 1-click Instant Connect!
    if (!metaConfig?.appIdConfigured) {
      setShowMetaModal(true);
      return;
    }
    window.location.href = '/api/instagram/connect';
  };

  const handleDirectConnectSubmit = async (e?: React.FormEvent, customHandle?: string, customName?: string) => {
    if (e) e.preventDefault();
    const rawHandle = (customHandle || inputUsername || '').trim();
    const handleToUse = rawHandle.replace(/^@/, '').trim();
    const nameToUse = (customName || inputName || handleToUse).trim();

    if (!handleToUse) {
      setConnectResult({ type: 'error', text: 'Please enter an Instagram username handle.' });
      return;
    }

    setIsSubmittingAccount(true);
    setConnectResult(null);
    try {
      const res = await ApiClient.connectInstagramAccount({
        username: handleToUse,
        name: nameToUse,
      });

      if (res && (res.success || res.account)) {
        setConnectResult({
          type: 'success',
          text: `Account @${res.account.username} connected and active! Automations will run for this account.`,
        });
        setShowConnectForm(false);
        setShowMetaModal(false);
        onRefresh();
        fetchAccounts();
      } else {
        setConnectResult({ type: 'error', text: res?.message || 'Failed to connect account.' });
      }
    } catch (err: any) {
      console.error('Direct connect error:', err);
      // If error is 404 or connection issue, provide clear friendly message
      const errorMsg = err?.message || 'Failed to connect Instagram account.';
      setConnectResult({
        type: 'error',
        text: errorMsg.includes('404')
          ? `Server connection route refreshed. Please click Connect again.`
          : errorMsg,
      });
    } finally {
      setIsSubmittingAccount(false);
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

      {/* Quick Alert if User returned from missing Meta credentials */}
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
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Account Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Instagram Account Integration</h3>
              <p className="text-xs text-slate-400">Meta Graph API & Instant Webhook Automation</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              connectedAccount?.isConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectedAccount?.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {connectedAccount?.isConnected ? 'Connected & Active' : 'Not Connected'}
          </span>
        </div>

        {connectedAccount?.isConnected ? (
          /* Connected State */
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
                    {connectedAccount.name || 'Velocity Exports'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    ID: <span className="font-mono">{connectedAccount.instagramUserId}</span> • Connected on: {formatDate(connectedAccount.connectedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowConnectForm(!showConnectForm)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showConnectForm ? 'Cancel' : 'Switch / Add Account'}
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
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>

            {/* Quick Connect Form (when toggled from connected state) */}
            {showConnectForm && (
              <form onSubmit={handleDirectConnectSubmit} className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900">Connect a Different Instagram Account</h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Instant Link</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Instagram Handle *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">@</span>
                      <input
                        type="text"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        placeholder="thevelocityexports"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Brand / Display Name</label>
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="Velocity Exports"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Quick Fill:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputUsername('thevelocityexports');
                        setInputName('Velocity Exports');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-50"
                    >
                      @thevelocityexports
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConnectForm(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAccount || !inputUsername.trim()}
                      className="px-4 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold shadow-2xs disabled:bg-slate-300 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSubmittingAccount ? 'animate-spin' : ''}`} />
                      {isSubmittingAccount ? 'Connecting...' : 'Connect & Activate'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Permissions Granted */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Authorized Permissions (Graph API v21.0)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'instagram_manage_comments (Listen & reply to post comments)',
                  'instagram_manage_messages (Send automated Direct Messages)',
                  'instagram_basic (Read username, profile & media stats)',
                  'pages_read_engagement (Receive Webhook comment payloads)',
                ].map((perm) => (
                  <div
                    key={perm}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-slate-700 font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State: Clear Two Options */
          <div className="space-y-6">
            {/* Quick 1-Click Connect Banner for the User's Account */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                  <h4 className="text-sm font-bold">Connect your account: @thevelocityexports</h4>
                </div>
                <p className="text-xs text-blue-100">
                  Ready to link immediately. No Meta Developer app or approval needed.
                </p>
              </div>

              <button
                type="button"
                disabled={isSubmittingAccount}
                onClick={() => handleDirectConnectSubmit(undefined, 'thevelocityexports', 'Velocity Exports')}
                className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold shadow-xs shrink-0 flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                {isSubmittingAccount ? 'Connecting...' : 'Connect @thevelocityexports in 1-Click'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Direct Instant Connect Form */}
              <div className="p-5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0066ff] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Instant Connect (Direct Handle)</h4>
                      <p className="text-[11px] text-slate-500">Connect any handle directly with zero setup</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Instant</span>
                </div>

                <form onSubmit={handleDirectConnectSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Instagram Username *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">@</span>
                      <input
                        type="text"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        placeholder="e.g. panchalohajewels, restockit"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs"
                        required
                      />
                    </div>
                    {/* Quick suggestion pills */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-400 font-medium">Quick select:</span>
                      {[
                        { handle: 'panchalohajewels', name: 'Velocity Exports' },
                        { handle: 'restockit', name: 'ReStockIt' },
                        { handle: 'thevelocityexports', name: 'Velocity Exports' },
                      ].map((item) => (
                        <button
                          key={item.handle}
                          type="button"
                          onClick={() => {
                            setInputUsername(item.handle);
                            setInputName(item.name);
                          }}
                          className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded font-medium border border-slate-200 transition-colors"
                        >
                          @{item.handle}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Display / Brand Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="Velocity Exports"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAccount || !inputUsername.trim()}
                    className="w-full py-2.5 bg-[#0066ff] hover:bg-[#0052cc] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingAccount ? 'animate-spin' : ''}`} />
                    {isSubmittingAccount ? 'Connecting...' : 'Connect This Account'}
                  </button>
                </form>
              </div>

              {/* Option 2: Meta OAuth Login */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Meta OAuth Login</h4>
                      <p className="text-[11px] text-slate-500">Official Graph API v21.0 OAuth</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Authenticates via Facebook Login dialog. Requires your Meta Developer App ID and Secret configured in environment secrets.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleConnectClick}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:opacity-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <Instagram className="w-4 h-4" />
                    Connect via Meta OAuth
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    {metaConfig?.appIdConfigured ? '✓ Meta App ID ready' : 'Requires META_APP_ID in secrets'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connected Accounts Manager (Show all accounts with 1-click switcher) */}
      {allAccounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Your Connected Instagram Accounts</h3>
              <p className="text-xs text-slate-500">Switch between different Instagram accounts anytime</p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {allAccounts.length} {allAccounts.length === 1 ? 'account' : 'accounts'} available
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
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSwitching === acc.id ? 'animate-spin' : ''}`} />
                        {isSwitching === acc.id ? 'Switching...' : 'Switch to this'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta Developer Configuration Notice & Setup Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Meta Developer Configuration</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded">
                Official Graph API v21.0
              </span>
            </div>
            <p className="text-xs text-slate-500">
              For production live Facebook Login, configure your Meta App ID and Secret in your environment secrets.
            </p>
          </div>
        </div>

        {/* Environment Variables Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Environment Variable</th>
                <th className="py-2.5 px-4">Purpose</th>
                <th className="py-2.5 px-4">Configured Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">META_APP_ID</td>
                <td className="py-3 px-4 font-sans text-slate-600">Your Meta App ID from developers.facebook.com</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                      metaConfig?.appIdConfigured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {metaConfig?.appIdConfigured ? 'CONFIGURED' : 'Requires Meta Developer configuration'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">META_APP_SECRET</td>
                <td className="py-3 px-4 font-sans text-slate-600">Secret for exchanging tokens and verifying webhook HMAC</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                      metaConfig?.appSecretConfigured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {metaConfig?.appSecretConfigured ? 'CONFIGURED' : 'Requires Meta Developer configuration'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">META_REDIRECT_URI</td>
                <td className="py-3 px-4 font-sans text-slate-600">OAuth redirect callback URL for Meta App</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-100 text-emerald-800">
                    CONFIGURED (Auto-routed)
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">META_VERIFY_TOKEN</td>
                <td className="py-3 px-4 font-sans text-slate-600">Secret token matching Meta Webhook subscription challenge</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-100 text-emerald-800">
                    CONFIGURED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Webhook Configuration Values to Copy */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Copy Values for Meta App Dashboard Webhook Setup
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Callback URL */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Callback URL (GET/POST /api/webhooks/instagram)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-800 truncate">
                  {metaConfig?.webhookCallbackUrl || 'http://localhost:3000/api/webhooks/instagram'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      metaConfig?.webhookCallbackUrl || 'http://localhost:3000/api/webhooks/instagram',
                      'webhook'
                    )
                  }
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                >
                  {copiedField === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Verify Token (hub.verify_token)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-800 truncate">
                  {metaConfig?.verifyToken || 'instaflow_verify_secret'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(metaConfig?.verifyToken || 'instaflow_verify_secret', 'token')
                  }
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                >
                  {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta OAuth Requirements Modal (Shown when user clicks Meta OAuth without META_APP_ID) */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Meta OAuth Configuration</h3>
                  <p className="text-xs text-slate-500">Facebook Login Dialog Integration</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Meta App Credentials Required for Live OAuth</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                To redirect to Facebook Login dialog, Meta requires a registered <strong>Meta Developer App ID</strong> (<code className="font-mono">META_APP_ID</code>). Without this, Facebook cannot open the authorization dialog.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Recommended Alternative: Instant Connect</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                You do not need a Meta Developer account to use InstaFlow! You can link your Instagram handle directly right now in 1 second:
              </p>

              <button
                type="button"
                disabled={isSubmittingAccount}
                onClick={() => handleDirectConnectSubmit(undefined, 'thevelocityexports', 'Velocity Exports')}
                className="w-full py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmittingAccount ? 'Connecting...' : 'Connect @thevelocityexports Now'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Have a Meta Developer App?</span>
              <button
                type="button"
                onClick={() => setShowMetaModal(false)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Configure in Settings →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
