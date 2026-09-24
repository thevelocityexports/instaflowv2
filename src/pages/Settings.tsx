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
} from 'lucide-react';
import { ApiClient } from '../services/api';

export const Settings: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
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

  useEffect(() => {
    checkStatus();
  }, []);

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
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Supabase Database Setup</h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your Supabase PostgreSQL database to persist Instagram automations, accounts, and execution logs.
        </p>
      </div>

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
      </div>

      {/* Step-by-Step Supabase Setup Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>How to Setup Supabase for InstaFlow</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
            3 Quick Steps
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-[#0066ff] text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#0066ff] hover:underline flex items-center gap-1 font-semibold"
              >
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h4 className="font-bold text-slate-900">Create Supabase Project</h4>
            <p className="text-slate-600 leading-relaxed">
              Sign up or log in to Supabase, click <strong>"New Project"</strong>, choose a name and region, and set your database password.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#0066ff] text-white font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h4 className="font-bold text-slate-900">Run SQL Migration</h4>
            <p className="text-slate-600 leading-relaxed">
              Open the <strong>SQL Editor</strong> tab on the left sidebar in Supabase, click <strong>"New Query"</strong>, paste the SQL script below, and click <strong>"Run"</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#0066ff] text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h4 className="font-bold text-slate-900">Add Secrets / Env Vars</h4>
            <p className="text-slate-600 leading-relaxed">
              Go to <strong>Project Settings → API</strong>. Copy your <strong>Project URL</strong> and <strong>service_role (secret)</strong> key into your project secrets:
            </p>
            <div className="font-mono text-[10px] bg-white p-2 rounded border border-slate-200 text-slate-800 space-y-0.5">
              <div>SUPABASE_URL</div>
              <div>SUPABASE_SERVICE_ROLE_KEY</div>
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
  );
};
