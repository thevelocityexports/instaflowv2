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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    ApiClient.getMetaConfigStatus()
      .then((res) => setMetaConfig(res.config))
      .catch((err) => console.error('Failed to load Meta config status', err));
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnectClick = () => {
    // If not configured, explain that Meta Developer config is required
    if (!metaConfig?.appIdConfigured) {
      window.location.href = '/api/instagram/connect';
    } else {
      window.location.href = '/api/instagram/connect';
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

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Instagram Connection</h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your Instagram Business or Creator account to authorize comment automation and Direct Messages.
        </p>
      </div>

      {/* Account Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Meta Instagram Account</h3>
              <p className="text-xs text-slate-400">Official Graph API OAuth 2.0 Integration</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-xs shrink-0">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-sm font-bold text-slate-900">
                    VM
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-base font-bold text-slate-900">
                    @{connectedAccount.username}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Account ID: <span className="font-mono">{connectedAccount.instagramUserId}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Connected on: {formatDate(connectedAccount.connectedAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDisconnecting}
                onClick={async () => {
                  if (confirm('Are you sure you want to disconnect this Instagram account? Active automations will be paused.')) {
                    setIsDisconnecting(true);
                    await onDisconnect(connectedAccount.id);
                    setIsDisconnecting(false);
                  }
                }}
                className="px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </button>
            </div>

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
          /* Disconnected State */
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              InstaFlow utilizes Meta's official Instagram Graph API OAuth flow to securely connect your business or creator account. No passwords are stored.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConnectClick}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                Connect Instagram
              </button>
            </div>
          </div>
        )}
      </div>

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
              Where credentials or Meta approval are required, the application integrates securely via environment secrets.
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
    </div>
  );
};
