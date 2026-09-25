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
  Eye,
  EyeOff,
  Save,
  Zap,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { InstagramAccount, MetaConfigStatus } from '../../shared/types';
import { ApiClient } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';

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
  const [inputAccessToken, setInputAccessToken] = useState('');
  const [inputIgUserId, setInputIgUserId] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isPurgingDemo, setIsPurgingDemo] = useState(false);
  const [connectResult, setConnectResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Meta Developer Credentials Form State
  const [inputAppId, setInputAppId] = useState('');
  const [inputAppSecret, setInputAppSecret] = useState('');
  const [inputVerifyToken, setInputVerifyToken] = useState('instaflow_verify_secret');
  const [inputWebhookUrl, setInputWebhookUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSavingMetaConfig, setIsSavingMetaConfig] = useState(false);
  const [metaSaveResult, setMetaSaveResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Webhook Diagnostic Verification State
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string; challenge?: string } | null>(null);

  // Meta OAuth Guidance / Configuration Modal
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
      .then((res) => {
        setMetaConfig(res.config);
        if (res.config?.appId) setInputAppId(res.config.appId);
        if (res.config?.verifyToken) setInputVerifyToken(res.config.verifyToken);
        if (res.config?.webhookCallbackUrl) {
          setInputWebhookUrl(res.config.webhookCallbackUrl);
        } else if (typeof window !== 'undefined') {
          setInputWebhookUrl(`${window.location.origin}/api/webhooks/instagram`);
        }
      })
      .catch((err) => {
        console.error('Failed to load Meta config status', err);
        if (typeof window !== 'undefined') {
          setInputWebhookUrl(`${window.location.origin}/api/webhooks/instagram`);
        }
      });

    fetchAccounts();
  }, []);

  const handleCopy = async (text: string, field: string) => {
    // Fallback to computed values if empty
    let textToCopy = text.trim();
    if (!textToCopy && field === 'url') {
      textToCopy = metaConfig?.webhookCallbackUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/instagram` : '');
    } else if (!textToCopy && field === 'token') {
      textToCopy = inputVerifyToken || metaConfig?.verifyToken || 'instaflow_verify_secret';
    } else if (!textToCopy && field === 'redirect') {
      textToCopy = metaConfig?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/instagram/callback` : '');
    }

    if (!textToCopy) return;

    const copied = await copyToClipboard(textToCopy);
    if (copied) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await ApiClient.testWebhookVerify(inputVerifyToken.trim() || undefined);
      setWebhookTestResult({
        success: res.success,
        message: res.message,
        challenge: res.simulatedChallenge,
      });
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: err.message || 'Webhook verification challenge failed. Please check server logs.',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveMetaCredentials = async (andConnect: boolean = false) => {
    if (!inputAppId.trim()) {
      setMetaSaveResult({ type: 'error', text: 'Please enter your Meta App ID from developers.facebook.com.' });
      return;
    }
    if (!inputAppSecret.trim() && !metaConfig?.appSecretConfigured) {
      setMetaSaveResult({ type: 'error', text: 'Please enter your Meta App Secret from App Settings → Basic.' });
      return;
    }

    setIsSavingMetaConfig(true);
    setMetaSaveResult(null);

    try {
      const res = await ApiClient.saveMetaConfig({
        appId: inputAppId.trim(),
        appSecret: inputAppSecret.trim() || undefined,
        verifyToken: inputVerifyToken.trim() || undefined,
        webhookCallbackUrl: inputWebhookUrl.trim() || undefined,
      });

      if (res && res.success) {
        setMetaConfig(res.config);
        setMetaSaveResult({
          type: 'success',
          text: '✓ Meta Developer credentials saved successfully! OAuth & Webhook endpoints are ready.',
        });
        if (andConnect) {
          setShowMetaModal(false);
          window.location.href = '/api/instagram/connect';
        }
      } else {
        setMetaSaveResult({ type: 'error', text: res.message || 'Failed to save Meta credentials.' });
      }
    } catch (err: any) {
      setMetaSaveResult({ type: 'error', text: err.message || 'Failed to save credentials.' });
    } finally {
      setIsSavingMetaConfig(false);
    }
  };

  const handleConnectClick = () => {
    // If Meta App ID or Secret is not configured, open the credentials input modal directly!
    if (!metaConfig?.appIdConfigured || !metaConfig?.appSecretConfigured) {
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
        instagramUserId: inputIgUserId.trim() || undefined,
        accessToken: inputAccessToken.trim() || undefined,
      });

      if (res && (res.success || res.account)) {
        setConnectResult({
          type: 'success',
          text: `Account @${res.account.username} connected and active! Automations and live reels are ready.`,
        });
        setShowConnectForm(false);
        setShowMetaModal(false);
        setInputAccessToken('');
        setInputIgUserId('');
        onRefresh();
        fetchAccounts();
      } else {
        setConnectResult({ type: 'error', text: res?.message || 'Failed to connect account.' });
      }
    } catch (err: any) {
      console.error('Direct connect error:', err);
      const errorMsg = err?.message || 'Failed to connect Instagram account. Please try again.';
      setConnectResult({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handlePurgeDemoAccounts = async () => {
    if (!confirm('Are you sure you want to remove all demo accounts and sample automations? This will leave a clean workspace for your real account.')) {
      return;
    }
    setIsPurgingDemo(true);
    try {
      const res = await ApiClient.clearDemoAccounts();
      setConnectResult({
        type: 'success',
        text: res.message || 'Demo accounts and sample data removed successfully.',
      });
      onRefresh();
      fetchAccounts();
    } catch (err: any) {
      setConnectResult({
        type: 'error',
        text: err?.message || 'Failed to clear demo accounts.',
      });
    } finally {
      setIsPurgingDemo(false);
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

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Meta Graph Access Token (Optional — enables live Reels fetching)
                  </label>
                  <input
                    type="password"
                    value={inputAccessToken}
                    onChange={(e) => setInputAccessToken(e.target.value)}
                    placeholder="EAA... (User or Page Access Token from developers.facebook.com)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                  />
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
                        placeholder="thevelocityexports"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs"
                        required
                      />
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

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Meta Graph Access Token (Optional — enables live Reels fetching)
                    </label>
                    <input
                      type="password"
                      value={inputAccessToken}
                      onChange={(e) => setInputAccessToken(e.target.value)}
                      placeholder="EAA... (from developers.facebook.com or Graph Explorer)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs"
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
                    {metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured
                      ? 'Connect via Meta OAuth'
                      : 'Enter App ID & Connect via Meta'}
                  </button>
                  <p className="text-[11px] text-center text-slate-500">
                    {metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured
                      ? '✓ Meta App ID & Secret ready to connect'
                      : 'Click to enter your Meta App ID & Secret'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connected Accounts Manager (Show all accounts with 1-click switcher & Purge Demo) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Connected Accounts Manager</h3>
            <p className="text-xs text-slate-500">Manage and switch between your connected Instagram accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPurgingDemo}
              onClick={handlePurgeDemoAccounts}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              {isPurgingDemo ? 'Removing demo...' : 'Remove All Demo Accounts'}
            </button>
            <span className="text-xs text-slate-400 font-semibold">
              {allAccounts.length} {allAccounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>
        </div>

        {allAccounts.length > 0 ? (
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
                        {acc.accessToken && (
                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-semibold rounded">
                            Graph API Token
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
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      title="Delete account"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-700">No Instagram accounts connected.</p>
            <p className="text-[11px] text-slate-500">Connect your account above to begin running automations.</p>
          </div>
        )}
      </div>

      {/* Interactive Meta Developer Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Meta Developer API Credentials</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-mono font-bold rounded">
                Graph API v21.0
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Enter your Meta App ID and Secret from{' '}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
              >
                developers.facebook.com
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              to enable live OAuth login and real webhook delivery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured
                ? 'Credentials Configured'
                : 'Setup Required'}
            </span>
          </div>
        </div>

        {/* Save Result Notification */}
        {metaSaveResult && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
              metaSaveResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {metaSaveResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{metaSaveResult.text}</span>
            </div>
            <button onClick={() => setMetaSaveResult(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveMetaCredentials(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meta App ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Meta App ID *
                </label>
                <span className="text-[10px] text-slate-400">Found in Meta App Settings → Basic</span>
              </div>
              <input
                type="text"
                value={inputAppId}
                onChange={(e) => setInputAppId(e.target.value)}
                placeholder="e.g. 152014204821362"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                required
              />
            </div>

            {/* Meta App Secret */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Meta App Secret *
                </label>
                {metaConfig?.appSecretMasked && (
                  <span className="text-[10px] font-mono text-emerald-600">
                    Saved: {metaConfig.appSecretMasked}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={inputAppSecret}
                  onChange={(e) => setInputAppSecret(e.target.value)}
                  placeholder={
                    metaConfig?.appSecretConfigured
                      ? '•••••••••••••••••••• (Leave blank to keep saved secret)'
                      : 'Paste App Secret from Meta dashboard'
                  }
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Webhook Callback URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Webhook Callback URL (Meta Webhooks)
                </label>
                <span className="text-[10px] text-slate-400">
                  {copiedField === 'url' ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  ) : (
                    'Click input or button to copy'
                  )}
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputWebhookUrl}
                  onChange={(e) => setInputWebhookUrl(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="https://your-public-url.run.app/api/webhooks/instagram"
                  className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(inputWebhookUrl, 'url')}
                  title="Copy Callback URL to clipboard"
                  className={`absolute inset-y-1 right-1 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedField === 'url'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {copiedField === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Paste this into Meta App Dashboard → Webhooks → Instagram → Callback URL.
              </p>
            </div>

            {/* Verify Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Webhook Verify Token
                </label>
                <span className="text-[10px] text-slate-400">
                  {copiedField === 'token' ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  ) : (
                    'Must match Meta challenge'
                  )}
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputVerifyToken}
                  onChange={(e) => setInputVerifyToken(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="instaflow_verify_secret"
                  className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(inputVerifyToken, 'token')}
                  title="Copy Verify Token to clipboard"
                  className={`absolute inset-y-1 right-1 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedField === 'token'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {copiedField === 'token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedField === 'token' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Must match the verify token you enter in Meta's Webhook configuration.
              </p>
            </div>
          </div>

          {/* Webhook Verification Diagnostic Feedback */}
          {webhookTestResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
                webhookTestResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {webhookTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-medium">{webhookTestResult.message}</span>
              </div>
              {webhookTestResult.challenge && (
                <div className="flex items-center gap-1 font-mono text-[10px] bg-white px-2 py-1 rounded border border-emerald-200 text-emerald-800">
                  <span className="text-slate-400">Response:</span>
                  <span>{webhookTestResult.challenge}</span>
                </div>
              )}
            </div>
          )}

          {/* Meta Callback URL Guidance */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-blue-900">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>What to do if Meta says "The URL couldn't be validated"?</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              1. <strong>Direct challenge check:</strong> Click <strong>"Test Webhook Verification"</strong> below to confirm your server's verification logic is 100% active and healthy.<br />
              2. <strong>Vercel Full-Stack Deployment:</strong> If hosting on Vercel (such as <code className="bg-blue-100/90 px-1 py-0.5 rounded font-mono">instaflowv2.vercel.app</code>), the project includes <code className="bg-blue-100/90 px-1 py-0.5 rounded font-mono">vercel.json</code> and <code className="bg-blue-100/90 px-1 py-0.5 rounded font-mono">api/</code> serverless functions so all <code className="bg-blue-100/90 px-1 py-0.5 rounded font-mono">/api/webhooks/*</code> endpoints run as live serverless functions. Push or trigger a redeploy on Vercel to activate.<br />
              3. <strong>Instant Local Testing:</strong> You can also use the <strong>Test & Simulate</strong> tab to trigger and verify comment automations immediately without waiting for Meta review!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Meta OAuth Redirect URI:
              </span>
              <code className="px-2 py-1 bg-slate-100 rounded font-mono text-[10px] text-slate-800 border border-slate-200">
                {metaConfig?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/instagram/callback` : 'https://.../api/instagram/callback')}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(metaConfig?.redirectUri || '', 'redirect')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 ml-1"
              >
                {copiedField === 'redirect' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'redirect' ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                title="Simulate Meta's verification challenge to verify server readiness"
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                <span>{isTestingWebhook ? 'Testing...' : 'Test Webhook Verification'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingMetaConfig}
                className="px-5 py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save className={`w-3.5 h-3.5 ${isSavingMetaConfig ? 'animate-spin' : ''}`} />
                {isSavingMetaConfig ? 'Saving Credentials...' : 'Save Meta Credentials'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Meta OAuth Configuration Modal */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enter Meta App Credentials</h3>
                  <p className="text-xs text-slate-500">Required for official Facebook Login OAuth</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {metaSaveResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  metaSaveResult.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {metaSaveResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{metaSaveResult.text}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste your App ID and App Secret from{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  developers.facebook.com
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                (Dashboard → App settings → Basic):
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta App ID *
                </label>
                <input
                  type="text"
                  value={inputAppId}
                  onChange={(e) => setInputAppId(e.target.value)}
                  placeholder="e.g. 152014204821362"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta App Secret *
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={inputAppSecret}
                    onChange={(e) => setInputAppSecret(e.target.value)}
                    placeholder="Paste your App Secret"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSavingMetaConfig || !inputAppId.trim()}
                  onClick={() => handleSaveMetaCredentials(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Instagram className="w-4 h-4" />
                  {isSavingMetaConfig ? 'Saving...' : 'Save & Connect via Facebook Login'}
                </button>

                <button
                  type="button"
                  disabled={isSavingMetaConfig || !inputAppId.trim()}
                  onClick={() => handleSaveMetaCredentials(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Save Credentials Only
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Want to test immediately without Meta review?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMetaModal(false);
                  handleDirectConnectSubmit(undefined, 'thevelocityexports', 'Velocity Exports');
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Connect @thevelocityexports Directly (Instant Mode)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
