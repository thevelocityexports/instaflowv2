# InstaFlow — Instagram Comment Automation SaaS MVP (V1)

InstaFlow is a production-structured full-stack Instagram comment automation web application. It automates the exact workflow:

**Instagram Comment → Keyword Match → Public Comment Reply and/or Private Instagram Direct Message (DM)**

---

## 1. Product Overview & Architecture

InstaFlow is architected with clear boundaries separating UI, REST API routes, authentication, database storage, Meta Graph API integration, webhook ingestion, and the core automation engine.

```
/
├── client (React 19 + TypeScript + Tailwind CSS)
│   ├── src/components/       # UI components & interactive Instagram phone simulator
│   ├── src/pages/            # Dashboard, Automations, Comments, Instagram, Settings
│   └── src/services/api.ts   # Typed API client
├── server (Node.js + Express + TypeScript)
│   ├── routes/               # /api/automations, /api/comments, /api/instagram, /api/webhooks, /api/test
│   ├── services/             # automationService, webhookService, instagramService, databaseService, authService, loggingService
│   ├── db/schema.sql         # PostgreSQL migration schema with RLS
│   └── test/                 # 14-point test suite for keyword matching & engine verification
└── shared/types.ts           # Shared TypeScript interfaces & models
```

---

## 2. Core V1 Capabilities

1. **Automation Trigger & Conditions**:
   - Evaluates incoming Instagram post comments.
   - Post scope: All posts & reels, or specific post filter.
   - Keyword match modes: `Contains` (substring matching) and `Exact match`.
   - Case-insensitive matching with full whitespace normalization.
   - Multiple keywords per automation (e.g. `PRICE`, `PRICE?`, `COST`, `HOW MUCH`, `LINK`).

2. **Actions**:
   - **ACTION 1: Public Comment Reply**: Directly replies beneath the user's comment on the Instagram post.
   - **ACTION 2: Private Instagram DM**: Sends a direct message with optional link URL and button label into the user's Instagram Direct inbox.
   - Either or both actions can be toggled on or off per automation.

3. **Production Safety & Reliability**:
   - **Idempotency Guard**: Tracks incoming comment IDs in `processed_events` to prevent duplicate processing.
   - **Credential Isolation**: All Meta Graph API access tokens, client secrets, and service-role keys are strictly server-side and never exposed to client bundles.
   - **Audit Log Sanitization**: All access tokens and sensitive parameters are automatically redacted before logging.
   - **Interactive Development / Test Mode**: A dedicated event simulator lets you test automations end-to-end without needing live Instagram comments or risking test spam.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, tsx
- **Database**: Supabase PostgreSQL (with automatic dual-mode local fallback for development)
- **Authentication**: Supabase Auth
- **Social Graph**: Meta Instagram Graph API v21.0 & Webhooks

---

## 4. Setup Instructions

### Prerequisites
- Node.js 18+ and npm

### Installation & Launch
```bash
# Install dependencies
npm install

# Start development server (serves REST API + React Vite on port 3000)
npm run dev

# Run the 14-point automation engine test suite
npm test

# Build for production
npm run build
npm start
```

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env` and provide your secrets:

```env
# Server Port
PORT=3000

# App URL (Used for Webhook verification and OAuth redirects)
APP_URL=http://localhost:3000

# Meta Developer App Credentials (developers.facebook.com)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:3000/api/instagram/callback
META_VERIFY_TOKEN=instaflow_verify_secret

# Supabase PostgreSQL Configuration (supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

*Note: If Meta or Supabase variables are not set, InstaFlow gracefully operates in local development mode with seeded mock accounts, persistent in-memory database storage, and a test simulator.*

---

## 6. Supabase Database Migration

To provision your PostgreSQL database on Supabase:
1. Open your Supabase Project Dashboard → **SQL Editor**.
2. Copy the SQL script located in `/server/db/schema.sql` (or copy directly from the **Settings** page in the InstaFlow dashboard).
3. Click **Run**. This provisions:
   - `public.users`
   - `public.instagram_accounts`
   - `public.automations`
   - `public.automation_actions`
   - `public.comment_logs`
   - `public.processed_events` (Idempotency table)
   - Row Level Security (RLS) policies and performance indexes.

---

## 7. Meta Developer & Webhook Configuration

1. Create an app on [developers.facebook.com](https://developers.facebook.com) of type **Business**.
2. Add the **Instagram Graph API** product.
3. Configure the following permissions in App Review / Permissions:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
4. Set the OAuth Redirect URI in Facebook Login settings:
   - `https://your-app-domain.com/api/instagram/callback`
5. Configure Webhooks:
   - Object: **Instagram**
   - Callback URL: `https://your-app-domain.com/api/webhooks/instagram`
   - Verify Token: The value defined in `META_VERIFY_TOKEN` (e.g. `instaflow_verify_secret`).
   - Subscribe to the `comments` field.

---

## 8. Testing Instructions

### Automated Unit & Integration Tests
Run the comprehensive test runner covering all 14 required cases:
```bash
npm test
```
The test suite verifies:
1. Whitespace normalization
2. Case-insensitive matching
3. Contains keyword matching
4. Exact keyword matching
5. Multiple keyword combinations
6. Inactive automation bypass
7. Duplicate comment event rejection (Idempotency)
8. Multiple matching automations execution
9. Successful public comment reply formatting
10. Successful private DM formatting
11. Meta API error resilience
12. Unauthorized user handling
13. Webhook verification challenge validation
14. Mock test event pipeline execution

### Interactive Test Simulator in UI
1. Click **Send Test Comment** in the top bar or sidebar.
2. Enter any mock username and comment text (e.g. `Can you send the PRICE for this?`).
3. Click **Send Test Comment** to execute the exact same automation pipeline as a live Meta webhook.
4. Inspect the resulting execution log under the **Comments** page.

---

## 9. Limitations of V1
- V1 is strictly focused on Instagram comment automation (Comment → Keyword → Public Reply & Private DM).
- Channels such as WhatsApp, Facebook Messenger, Telegram, and TikTok are out of scope for V1.
- AI conversational chatbots and complex multi-branch visual canvas builders are intentionally deferred to future versions.
