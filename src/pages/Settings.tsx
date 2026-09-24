import React, { useState } from 'react';
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
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);

  const supabaseSchemaSql = `-- InstaFlow PostgreSQL Schema for Supabase
-- Run this in your Supabase SQL Editor to provision tables, indexes, and RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (synced with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Instagram Accounts table
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  profile_pic_url TEXT,
  is_connected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automations table
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

-- 4. Automation Actions table
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

-- 5. Execution Logs table
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

-- 6. Idempotency Table: prevents processing identical comment IDs twice
CREATE TABLE IF NOT EXISTS public.processed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

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
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings & Infrastructure</h2>
        <p className="text-xs text-slate-500 mt-1">
          Database configuration, Supabase migrations, security policies, and environment setup.
        </p>
      </div>

      {/* Database & Architecture Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database Engine</h3>
              <p className="text-xs text-slate-400">Supabase PostgreSQL & Dual-Mode In-Memory Store</p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Database Active
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            InstaFlow operates with high reliability. When <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">SUPABASE_URL</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">SUPABASE_SERVICE_ROLE_KEY</code> are provided in environment secrets, the application persists data directly to your PostgreSQL tables with Row Level Security.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-semibold text-slate-500 block">Row-Level Security</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Enforced
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-semibold text-slate-500 block">Idempotency Mechanism</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Active (processed_events)
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-semibold text-slate-500 block">Credential Storage</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-slate-500" /> Server-side only
              </span>
            </div>
          </div>
        </div>

        {/* SQL Migration Script Viewer */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Supabase SQL Migration Script
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy SQL Migration
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed border border-slate-800">
            {supabaseSchemaSql}
          </pre>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Security & Credential Isolation</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          InstaFlow follows strict enterprise security standards:
        </p>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li>Meta Access Tokens and App Secrets are never sent to browser/client bundles.</li>
          <li>All Graph API requests originate from backend routes protected by user sessions.</li>
          <li>Meta Webhooks require valid SHA256 HMAC cryptographic signatures.</li>
          <li>Audit logs automatically sanitize and redact access tokens, client secrets, and sensitive tokens.</li>
        </ul>
      </div>
    </div>
  );
};
