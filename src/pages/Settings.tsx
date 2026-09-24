import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Server,
  Layers,
  Terminal,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Lock,
  Instagram,
  Globe,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { MetaConfigStatus } from '../../shared/types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meta' | 'database'>('meta');

  // Supabase Database State
  const [copiedSql, setCopiedSql] = useState(false);
  const [dbPassword, setDbPassword] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    success: boolean;
    provider: 'supabase' | 'local_memory';
    isUsingSupabase: boolean;
    projectId?: string | null;
    envConfig: {
      supabaseUrlConfigured: boolean;
      supabaseKeyConfigured: boolean;
    };
    tablesVerified: boolean;
    errorDetail?: string | null;
    message: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Meta Developer Credentials State
  const [metaConfig, setMetaConfig] = useState<MetaConfigStatus | null>(null);
  const [inputAppId, setInputAppId] = useState('');
  const [inputAppSecret, setInputAppSecret] = useState('');
  const [inputVerifyToken, setInputVerifyToken] = useState('instaflow_verify_secret');
  const [inputWebhookUrl, setInputWebhookUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaMsg, setMetaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await ApiClient.getDatabaseStatus();
      setDbStatus(res);
    } catch (err) {
      console.error('Failed to get database status', err);
    } finally {
      setIsChecking(false);
    }
  };

  const loadMetaConfig = async () => {
    try {
      const res = await ApiClient.getMetaConfigStatus();
      setMetaConfig(res.config);
      if (res.config?.appId) setInputAppId(res.config.appId);
      if (res.config?.verifyToken) setInputVerifyToken(res.config.verifyToken);
      if (res.config?.webhookCallbackUrl) setInputWebhookUrl(res.config.webhookCallbackUrl);
    } catch (err) {
      console.error('Failed to load Meta configuration', err);
    }
  };

  useEffect(() => {
    checkStatus();
    loadMetaConfig();
  }, []);

  const handleCopyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAppId.trim()) {
      setMetaMsg({ type: 'error', text: 'Please enter your Meta App ID.' });
      return;
    }
    if (!inputAppSecret.trim() && !metaConfig?.appSecretConfigured) {
      setMetaMsg({ type: 'error', text: 'Please enter your Meta App Secret.' });
      return;
    }

    setIsSavingMeta(true);
    setMetaMsg(null);
    try {
      const res = await ApiClient.saveMetaConfig({
        appId: inputAppId.trim(),
        appSecret: inputAppSecret.trim() || undefined,
        verifyToken: inputVerifyToken.trim() || undefined,
        webhookCallbackUrl: inputWebhookUrl.trim() || undefined,
      });

      if (res && res.success) {
        setMetaConfig(res.config);
        setMetaMsg({ type: 'success', text: 'Meta Developer API credentials saved successfully!' });
      } else {
        setMetaMsg({ type: 'error', text: res.message || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setMetaMsg({ type: 'error', text: err.message || 'Failed to save Meta credentials.' });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleRunAutomaticMigration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dbPassword.trim()) {
      setMigrationMsg({ type: 'error', text: 'Please enter your Supabase Database Password.' });
      return;
    }

    setIsMigrating(true);
    setMigrationMsg(null);
    try {
      const res = await ApiClient.runDatabaseMigration({ password: dbPassword.trim() });
      if (res.success) {
        setMigrationMsg({ type: 'success', text: res.message || 'All tables created and verified successfully!' });
        await checkStatus();
      } else {
        setMigrationMsg({ type: 'error', text: res.error || 'Migration failed. Please verify your password.' });
      }
    } catch (err: any) {
      setMigrationMsg({
        type: 'error',
        text: err.message || 'Failed to connect. Double-check your database password or use the SQL Editor below.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const supabaseSchemaSql = `-- InstaFlow PostgreSQL Schema for Supabase
-- Paste and run this in your Supabase Project -> SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users table (synced with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Instagram Accounts table
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  is_connected BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_type TEXT DEFAULT 'comment',
  target_post_type TEXT DEFAULT 'all',
  target_post_id TEXT,
  target_post_caption TEXT,
  match_type TEXT DEFAULT 'contains',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Automation Actions table
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  message_template TEXT NOT NULL,
  link_url TEXT,
  link_button_text TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Execution Logs table
CREATE TABLE IF NOT EXISTS public.comment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  automation_name TEXT,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  post_id TEXT,
  matched_keyword TEXT,
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL,
  meta_response JSONB,
  error_message TEXT,
  is_test_event BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Idempotency Table: ensures zero duplicate webhook comment executions
CREATE TABLE IF NOT EXISTS public.processed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_automations_account ON public.automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_comment_logs_account ON public.comment_logs(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_comment_logs_created ON public.comment_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_events_id ON public.processed_events(event_id);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_logs ENABLE ROW LEVEL SECURITY;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSchemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings & Integrations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure your Meta Developer credentials, Instagram OAuth, Webhooks, and Supabase PostgreSQL persistence.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'meta'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-rose-500" />
            Meta Developer API
            {metaConfig?.appIdConfigured && metaConfig?.appSecretConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'database'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Supabase Database
            {dbStatus?.isUsingSupabase ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'meta' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Meta API Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Meta Developer API Configuration</h3>
                    <p className="text-xs text-slate-500">Official Graph API v21.0 Credentials</p>
                  </div>
                </div>
              </div>

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
                  ? 'Configured & Active'
                  : 'App ID & Secret Required'}
              </span>
            </div>

            {metaMsg && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
                  metaMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {metaMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">{metaMsg.text}</span>
                </div>
                <button onClick={() => setMetaMsg(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMetaConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Meta App ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      Meta App ID *
                    </label>
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      Find in Meta Dashboard
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={inputAppId}
                    onChange={(e) => setInputAppId(e.target.value)}
                    placeholder="e.g. 152014204821362"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    Your numeric Application ID from Meta App Dashboard → App settings → Basic.
                  </p>
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
                  <p className="text-[10px] text-slate-400">
                    App Secret used for HMAC-SHA256 signature verification and OAuth token exchange.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Webhook Callback URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Webhook Callback URL
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyField(inputWebhookUrl || metaConfig?.webhookCallbackUrl || '', 'url')
                      }
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'url' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy URL
                    </button>
                  </div>
                  <input
                    type="text"
                    value={inputWebhookUrl}
                    onChange={(e) => setInputWebhookUrl(e.target.value)}
                    placeholder="https://.../api/webhooks/instagram"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                  />
                  <p className="text-[10px] text-slate-400">
                    Paste into Meta Webhooks setup. Meta requires a public <code className="font-mono">https://</code> URL.
                  </p>
                </div>

                {/* Verify Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Webhook Verify Token
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyField(inputVerifyToken, 'token')}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'token' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Token
                    </button>
                  </div>
                  <input
                    type="text"
                    value={inputVerifyToken}
                    onChange={(e) => setInputVerifyToken(e.target.value)}
                    placeholder="instaflow_verify_secret"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] shadow-2xs transition-all"
                  />
                  <p className="text-[10px] text-slate-400">
                    Matches the verify token you enter in Meta's Webhook challenge box.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Valid OAuth Redirect URI to register in Facebook Login settings:{' '}
                  <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px] text-slate-800">
                    {metaConfig?.redirectUri || 'https://.../api/instagram/callback'}
                  </code>
                </p>

                <button
                  type="submit"
                  disabled={isSavingMeta}
                  className="px-5 py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingMeta ? 'animate-spin' : ''}`} />
                  {isSavingMeta ? 'Saving...' : 'Save Meta Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-8 animate-in fade-in">
      {/* Connection Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database Engine Status</h3>
              <p className="text-xs text-slate-500">
                {dbStatus?.isUsingSupabase
                  ? 'Connected to live Supabase PostgreSQL'
                  : 'Running in Local Fallback In-Memory Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                dbStatus?.isUsingSupabase
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus?.isUsingSupabase ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {dbStatus?.isUsingSupabase ? 'Supabase Active' : 'Local Fallback'}
            </span>
          </div>
        </div>

        {/* Status Message Banner */}
        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed ${
            dbStatus?.isUsingSupabase
              ? dbStatus?.tablesVerified
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-blue-50/80 border-blue-200 text-blue-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {dbStatus?.isUsingSupabase ? (
              dbStatus?.tablesVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Database className="w-5 h-5 text-[#0066ff] shrink-0 mt-0.5" />
              )
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-bold text-sm">
                  {dbStatus?.isUsingSupabase
                    ? dbStatus?.tablesVerified
                      ? 'Supabase PostgreSQL Connected & Verified!'
                      : 'Supabase Credentials Connected Successfully!'
                    : 'Running in Local Fallback In-Memory Mode'}
                </p>
                <p className="mt-0.5 text-xs opacity-90">
                  {dbStatus?.isUsingSupabase
                    ? dbStatus?.tablesVerified
                      ? 'All tables (users, automations, logs) are live in your Supabase database.'
                      : `Connected to project (${dbStatus?.projectId || 'Supabase'}). One quick step remaining: create the database tables by running the SQL script in your Supabase SQL Editor.`
                    : dbStatus?.message}
                </p>
              </div>

              {dbStatus?.isUsingSupabase && !dbStatus?.tablesVerified && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={
                      dbStatus?.projectId
                        ? `https://supabase.com/dashboard/project/${dbStatus.projectId}/sql/new`
                        : 'https://supabase.com/dashboard'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        SQL Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Migration SQL
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={checkStatus}
                    disabled={isChecking}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    Verify Tables
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Automatic 1-Click Migration Card */}
        {dbStatus?.isUsingSupabase && !dbStatus?.tablesVerified && (
          <div className="p-5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066ff] text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Run Automatic Migration (Direct PostgreSQL)</h4>
                  <p className="text-xs text-slate-600">
                    Enter your Supabase database password below. Our server will connect directly to <code className="font-mono bg-blue-100/60 px-1 py-0.5 rounded text-blue-800">db.{dbStatus?.projectId || 'hxvaejudosjtqklwlaug'}.supabase.co</code> and create all tables in 5 seconds.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0066ff] px-2 py-0.5 rounded-full">
                Automatic
              </span>
            </div>

            <form onSubmit={handleRunAutomaticMigration} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Enter your Supabase Database Password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:border-transparent font-mono shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isMigrating || !dbPassword.trim()}
                  className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
                  {isMigrating ? 'Running Migration...' : 'Run Migration Now'}
                </button>
              </div>

              {migrationMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    migrationMsg.type === 'success'
                      ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100/80 text-rose-900 border border-rose-300'
                  }`}
                >
                  {migrationMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{migrationMsg.text}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Don't remember your database password? You can reset it in 10 seconds at{' '}
                <a
                  href={`https://supabase.com/dashboard/project/${dbStatus?.projectId || 'hxvaejudosjtqklwlaug'}/settings/database`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0066ff] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  Supabase Project Settings → Database <ExternalLink className="w-2.5 h-2.5" />
                </a>
                , or execute the SQL in the SQL Editor below.
              </p>
            </form>
          </div>
        )}
      </div>

      {/* Step-by-Step Supabase Setup Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Supabase Configuration Status</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
            3-Step Integration
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Completed
              </span>
            </div>
            <h4 className="font-bold text-slate-900">1. Supabase Project</h4>
            <p className="text-slate-600 leading-relaxed">
              Project created: <strong className="font-mono text-emerald-800">{dbStatus?.projectId || 'hxvaejudosjtqklwlaug'}</strong>
            </p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 rounded-xl space-y-2 border ${
              dbStatus?.tablesVerified
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-blue-50/60 border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-xs ${
                  dbStatus?.tablesVerified ? 'bg-emerald-600' : 'bg-[#0066ff]'
                }`}
              >
                {dbStatus?.tablesVerified ? '✓' : '2'}
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  dbStatus?.tablesVerified
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-blue-700 bg-blue-100'
                }`}
              >
                {dbStatus?.tablesVerified ? 'Completed' : 'Action Required'}
              </span>
            </div>
            <h4 className="font-bold text-slate-900">2. Run SQL Migration</h4>
            <p className="text-slate-600 leading-relaxed">
              {dbStatus?.tablesVerified
                ? 'All database tables and RLS security policies are live.'
                : 'Enter your database password above for automatic migration, or run the SQL script in your Supabase SQL Editor.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Completed
              </span>
            </div>
            <h4 className="font-bold text-slate-900">3. Secrets / Env Vars</h4>
            <div className="font-mono text-[10px] bg-white p-2 rounded border border-emerald-200 text-slate-800 space-y-1">
              <div className="flex items-center justify-between text-emerald-800">
                <span>SUPABASE_URL</span>
                <span className="text-[9px] font-bold bg-emerald-100 px-1 rounded">✓ Configured</span>
              </div>
              <div className="flex items-center justify-between text-emerald-800">
                <span>SUPABASE_SERVICE_ROLE_KEY</span>
                <span className="text-[9px] font-bold bg-emerald-100 px-1 rounded">✓ Configured</span>
              </div>
            </div>
          </div>
        </div>

        {/* SQL Script Viewer */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                SQL Migration Script (Ready to Copy)
              </h4>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="px-3.5 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Complete SQL Migration
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
            {supabaseSchemaSql}
          </pre>
        </div>
      </div>

      {/* Database Schema Reference */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Provisioned PostgreSQL Tables</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            {
              name: 'public.users',
              desc: 'Authenticated user profiles and settings',
            },
            {
              name: 'public.instagram_accounts',
              desc: 'Connected Meta Instagram business and creator accounts',
            },
            {
              name: 'public.automations',
              desc: 'Comment triggers, target posts, and keyword matching rules',
            },
            {
              name: 'public.automation_actions',
              desc: 'Public comment replies and Direct Message templates with link buttons',
            },
            {
              name: 'public.comment_logs',
              desc: 'Execution audit logs of incoming comments, matches, and Meta responses',
            },
            {
              name: 'public.processed_events',
              desc: 'Idempotency ledger preventing double-processing of comments',
            },
          ].map((t) => (
            <div key={t.name} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-mono font-bold text-slate-900 text-xs">{t.name}</span>
              <p className="text-slate-500 text-[11px]">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
