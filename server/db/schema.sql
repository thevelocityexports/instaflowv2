-- ==============================================================================
-- SAISHA / INSTAFLOW - SAAS DATA ARCHITECTURE SCHEMA (V2)
-- PostgreSQL / Supabase Relational Schema with Multi-Tenant Workspace Isolation,
-- Row-Level Security (RLS), Automation Execution Tracing, and Usage Metrics.
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES / USERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  company_name TEXT,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. WORKSPACES (Tenant Isolation Layer)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (workspace_id, user_id)
);

-- ==============================================================================
-- 3. PLATFORM ADMINS (Server-Side Platform Authorization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. SUBSCRIPTION PLANS & SUBSCRIPTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  max_instagram_accounts INT NOT NULL DEFAULT 1,
  max_automations INT NOT NULL DEFAULT 10,
  max_contacts INT NOT NULL DEFAULT 1000,
  max_monthly_interactions INT NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'legacy', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'TRIALING' CHECK (status IN ('TRIALING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. INSTAGRAM ACCOUNTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  name TEXT,
  display_name TEXT,
  profile_picture_url TEXT,
  access_token TEXT, -- Server-side only encrypted/stored token
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  is_connected BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  disconnected_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5B. INSTAGRAM MEDIA (POSTS & REELS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_media (
  id TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  caption TEXT,
  media_type TEXT NOT NULL,
  media_product_type TEXT DEFAULT 'FEED',
  is_reel BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  media_url TEXT,
  permalink TEXT,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (account_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ig_media_account ON public.instagram_media(account_id);
CREATE INDEX IF NOT EXISTS idx_ig_media_username ON public.instagram_media(username);
CREATE INDEX IF NOT EXISTS idx_ig_media_is_reel ON public.instagram_media(is_reel);

-- ==============================================================================
-- 6. INSTAGRAM CONTACTS & CUSTOM FIELDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_picture_url TEXT,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  first_interaction_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (instagram_account_id, instagram_user_id)
);

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (workspace_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.contact_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.instagram_contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date TIMESTAMPTZ,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (contact_id, custom_field_id)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0066ff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id UUID NOT NULL REFERENCES public.instagram_contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (contact_id, tag_id)
);

-- ==============================================================================
-- 7. AUTOMATIONS, TRIGGERS, NODES & EDGES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'comment',
  target_post_type TEXT NOT NULL DEFAULT 'all',
  target_post_id TEXT,
  target_post_url TEXT,
  target_post_thumbnail TEXT,
  target_post_caption TEXT,
  match_type TEXT NOT NULL DEFAULT 'contains',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{"commentsMatched": 0, "repliesSent": 0, "dmsSent": 0}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_activity_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'INSTAGRAM_COMMENT',
  trigger_source TEXT NOT NULL DEFAULT 'instagram_comment',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_type TEXT NOT NULL DEFAULT 'contains',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  target_post_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.automation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('TRIGGER', 'PUBLIC_COMMENT_REPLY', 'PRIVATE_DM', 'END')),
  name TEXT NOT NULL,
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.automation_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('public_reply', 'private_dm')),
  message_template TEXT NOT NULL,
  link_url TEXT,
  link_button_text TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. INSTAGRAM COMMENTS & MESSAGES (AUTHORITATIVE EVENT HISTORY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.instagram_contacts(id) ON DELETE SET NULL,
  external_comment_id TEXT NOT NULL,
  post_id TEXT,
  media_id TEXT,
  username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  parent_comment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.instagram_contacts(id) ON DELETE SET NULL,
  external_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type TEXT NOT NULL DEFAULT 'text',
  message_text TEXT NOT NULL,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Legacy automation_logs adapter table
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_user_id TEXT,
  username TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  post_id TEXT,
  matched_keyword TEXT,
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL CHECK (action_status IN ('success', 'failed', 'skipped')),
  meta_response JSONB,
  error_message TEXT,
  is_test_event BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. WEBHOOK EVENTS & IDEMPOTENCY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. EXECUTIONS (AUTOMATION & NODE EXECUTIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.instagram_contacts(id) ON DELETE SET NULL,
  trigger_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.automation_nodes(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')),
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 11. USAGE TRACKING & AUDIT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('COMMENT_RECEIVED', 'AUTOMATION_TRIGGERED', 'PUBLIC_REPLY_SENT', 'PRIVATE_DM_SENT', 'MESSAGE_FAILED', 'CONTACT_CREATED')),
  quantity INT NOT NULL DEFAULT 1,
  reference_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'USER',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id ON public.workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_workspace_id ON public.instagram_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_workspace_id ON public.instagram_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_instagram_contacts_account_user ON public.instagram_contacts(instagram_account_id, instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON public.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_account_id ON public.automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON public.automations(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_nodes_automation_id ON public.automation_nodes(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_edges_automation_id ON public.automation_edges(automation_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_account_id ON public.instagram_comments(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_ext_id ON public.instagram_comments(external_comment_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_contact_id ON public.instagram_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_ext_id ON public.webhook_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_auto_id ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_id ON public.usage_events(workspace_id);

-- ==============================================================================
-- 13. SEED DEFAULT PLANS
-- ==============================================================================
INSERT INTO public.plans (name, slug, description, price, billing_interval, max_instagram_accounts, max_automations, max_contacts, max_monthly_interactions, status)
VALUES
  ('Free Starter', 'starter', 'Get started with basic Instagram automation', 0.00, 'month', 1, 3, 500, 1000, 'active'),
  ('Pro Creator', 'pro', 'Unlimited keywords, live Reels sync, and higher DM volume', 29.00, 'month', 3, 25, 10000, 25000, 'active'),
  ('Agency & Enterprise', 'enterprise', 'Multi-brand management with high-throughput webhook delivery', 99.00, 'month', 10, 100, 100000, 250000, 'active')
ON CONFLICT (slug) DO NOTHING;
