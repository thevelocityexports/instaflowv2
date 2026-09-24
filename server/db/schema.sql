-- ==============================================================================
-- InstaFlow: Instagram Comment Automation SaaS
-- Supabase PostgreSQL Database Schema & Migrations
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Instagram Accounts Table
-- Stores connected Instagram Business/Creator accounts for each user
-- Note: sensitive tokens are never exposed via RLS or client-side queries
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  access_token TEXT, -- Encrypted/server-only access token
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, instagram_user_id)
);

-- 3. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'comment', -- V1 only comment
  target_post_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'specific', 'next'
  target_post_id TEXT,
  target_post_url TEXT,
  target_post_caption TEXT,
  match_type TEXT NOT NULL DEFAULT 'contains', -- 'contains' | 'exact'
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_activity_at TIMESTAMPTZ
);

-- 4. Automation Triggers Table (Normalized for future multi-channel expansion)
CREATE TABLE IF NOT EXISTS public.automation_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL DEFAULT 'instagram_comment',
  match_type TEXT NOT NULL DEFAULT 'contains',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  target_post_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Automation Actions Table
-- ACTION 1: Public Comment Reply
-- ACTION 2: Private Instagram DM
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('public_reply', 'private_dm')),
  message_template TEXT NOT NULL,
  link_url TEXT,
  link_button_text TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Automation Execution Logs
-- Stores detailed audit logs for every incoming comment & action
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  post_id TEXT,
  matched_keyword TEXT,
  action_type TEXT NOT NULL, -- 'public_reply', 'private_dm', 'no_match', 'duplicate_ignored'
  action_status TEXT NOT NULL CHECK (action_status IN ('success', 'failed', 'skipped')),
  meta_response JSONB, -- Sanitized Meta API response without tokens
  error_message TEXT,
  is_test_event BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Processed Events Table (Idempotency Mechanism)
-- Prevents duplicate comment processing when Meta retries webhook events
CREATE TABLE IF NOT EXISTS public.processed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE, -- Instagram comment id
  platform TEXT NOT NULL DEFAULT 'instagram',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_instagram_account_id ON public.automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON public.automations(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_automation_id ON public.automation_triggers(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_automation_id ON public.automation_actions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON public.automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_comment_id ON public.automation_logs(comment_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON public.processed_events(event_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only view and modify their own data
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_events ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Instagram accounts policies
CREATE POLICY "Users can view their own Instagram accounts"
  ON public.instagram_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram accounts"
  ON public.instagram_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram accounts"
  ON public.instagram_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram accounts"
  ON public.instagram_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Automations policies
CREATE POLICY "Users can view their own automations"
  ON public.automations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automations"
  ON public.automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automations"
  ON public.automations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automations"
  ON public.automations FOR DELETE
  USING (auth.uid() = user_id);

-- Automation triggers policies
CREATE POLICY "Users can view triggers of their automations"
  ON public.automation_triggers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = automation_triggers.automation_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage triggers of their automations"
  ON public.automation_triggers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = automation_triggers.automation_id AND a.user_id = auth.uid()
  ));

-- Automation actions policies
CREATE POLICY "Users can view actions of their automations"
  ON public.automation_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = automation_actions.automation_id AND a.user_id = auth.uid()
  ));

-- Automation logs policies
CREATE POLICY "Users can view their own automation logs"
  ON public.automation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for webhook background workers
