## Planner v2 Setup Guide (Vertex AI + Google Calendar OAuth + Supabase)

This guide walks you through every step to enable the new Planner v2 pipeline:
- Gemini 2.5 Pro (Vertex AI) for structured planning
- Google Calendar OAuth (separate calendar connection) for conflict-free scheduling
- Supabase for auth, storage, and Edge Functions

Target audience: you, running on Windows (PowerShell). Mac/Linux commands are similar unless noted.

---

## 0) Prerequisites

- Node 18+ and npm installed
- Git and Supabase CLI installed
  - Supabase CLI: https://supabase.com/docs/guides/cli
  - PowerShell (run as a normal user, not Admin)
- A Supabase project already created (you have one)
- A Google account you can use for Cloud Console

Optional but recommended:
- gcloud CLI (helps with enabling APIs and verifying roles)
  - https://cloud.google.com/sdk/docs/install

---

## 1) Vertex AI (Gemini 2.5 Pro) Setup

Goal: Create a GCP project, enable Vertex AI, create a service account, and generate a JSON key you’ll store as secrets in Supabase functions.

### 1.1 Create (or pick) a GCP project
1. Go to `https://console.cloud.google.com/`.
2. Top navbar → Project picker → New Project.
3. Name: `momentum-planner` (any name).
4. Click Create. Wait for the toast notification.

### 1.2 Link billing and set a soft budget
1. Left sidebar → Billing → Link your billing account to the project.
2. Left sidebar → Billing → Budgets & alerts → Create budget
   - Scope: this project only
   - Amount: small monthly amount (e.g., $20)
   - Alerts: 50%, 75%, 90%, 100%

### 1.3 Enable required APIs
1. Left sidebar → APIs & Services → Library.
2. Enable:
   - Vertex AI API
   - IAM Service Account Credentials API
   - Cloud Resource Manager API

### 1.4 Create a service account for Edge Functions
1. Left sidebar → IAM & Admin → Service Accounts → Create Service Account.
2. Name: `vertex-planner-sa`.
3. Grant roles:
   - Vertex AI User
   - Service Account Token Creator
4. Create and continue. Open the account you just created.
5. Keys tab → Add key → Create new key → JSON → Download the file (keep it safe).

### 1.5 Choose a region for Vertex AI
1. Vertex AI works well in `us-central1`. We’ll use that unless you prefer another region close to your users.

### 1.6 Test the service account (optional)
If you installed gcloud:
```
gcloud auth activate-service-account --key-file "C:\\path\\to\\vertex-planner-sa.json"
gcloud services list --enabled
```
You should see `aiplatform.googleapis.com` enabled.

### 1.7 Store SA credentials as Supabase function secrets
We need three environment variables in Supabase:
```
GCP_PROJECT_ID=<your_project_id>
GCP_LOCATION=us-central1
GCP_SA_KEY=<the entire JSON contents>
```

On Windows PowerShell, set them safely:
1. Put the JSON in a file, e.g., `C:\secrets\vertex-planner-sa.json`.
2. Run:
```
$sa = Get-Content -Raw -Path "C:\secrets\vertex-planner-sa.json"
supabase functions secrets set GCP_PROJECT_ID="<your_project_id>" GCP_LOCATION="us-central1" GCP_SA_KEY="$sa"
```
Verify:
```
supabase functions secrets list
```

---

## 2) Google Calendar OAuth (separate calendar connection)

Goal: Create a dedicated OAuth client for Calendar, so we can request offline access + calendar scopes and store refresh tokens in Supabase. This is separate from your existing Google login provider.

### 2.1 Enable Google Calendar API
1. In the same GCP project (or another dedicated one), go to `APIs & Services → Library`.
2. Enable `Google Calendar API`.

### 2.2 Configure OAuth consent screen (Testing mode)
1. `APIs & Services → OAuth consent screen` → User Type: External → Create.
2. App name: `Momentum Calendar Connector` (any name)
3. User support email: your email
4. Developer contact: your email
5. Scopes: Add the following
   - `.../auth/calendar.readonly`
   - (Optional, to write events) `.../auth/calendar.events`
6. Test users: Add your Google account now so you can authorize while the app is in testing mode.
7. Save.

### 2.3 Create OAuth Client ID for Web (used by Edge Function callback)
1. `APIs & Services → Credentials → Create Credentials → OAuth client ID`
2. Application type: Web application
3. Name: `Momentum Calendar OAuth (Web)`
4. Authorized redirect URIs (add both):
   - Production: `https://<YOUR_PROJECT_REF>.functions.supabase.co/calendar_proxy/callback`
   - Local: `http://localhost:54321/functions/v1/calendar_proxy/callback`
5. Create → Copy Client ID and Client Secret.

We will store both in Supabase function secrets as:
```
GOOGLE_CAL_CLIENT_ID
GOOGLE_CAL_CLIENT_SECRET
```

### 2.4 Store Calendar OAuth secrets in Supabase
```
supabase functions secrets set GOOGLE_CAL_CLIENT_ID="<your_client_id>" GOOGLE_CAL_CLIENT_SECRET="<your_client_secret>"
```

### 2.5 What the OAuth flow will do (for clarity)
- Frontend opens: `GET https://<PROJECT_REF>.functions.supabase.co/calendar_proxy/oauth/start`
- You sign in with Google, granting Calendar scopes with `access_type=offline` and `prompt=consent`.
- Google redirects to `/calendar_proxy/callback` (Edge Function) → exchanges `code` for tokens.
- Edge Function stores `{access_token, refresh_token, expiry}` in `public.calendar_accounts` for your user (encrypted via Vault or stored server-side).

This keeps your app’s auth (Supabase) separate from calendar authorization.

---

## 3) Supabase: Secrets, Tables, and Policies

Goal: Create the new tables, enable Row-Level Security (RLS), and set function secrets.

### 3.1 Verify Vault extension (for secrets)
1. Supabase Dashboard → Database → Extensions
2. Ensure `vault` is enabled (default in new projects). If not, enable it.

### 3.2 Create required tables (use SQL editor in Supabase)
Open Supabase Dashboard → SQL → New query. Run each block in order.

#### 3.2.1 user_planning_profile
```
create table if not exists public.user_planning_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_planning_profile enable row level security;

create policy "user can read own planning profile"
on public.user_planning_profile for select
using (auth.uid() = user_id);

create policy "user can upsert own planning profile"
on public.user_planning_profile for
  insert with check (auth.uid() = user_id),
  update using (auth.uid() = user_id);
```

#### 3.2.2 task_sessions (scheduled placements)
```
create table if not exists public.task_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_sessions_user_time
on public.task_sessions(user_id, start_at);

alter table public.task_sessions enable row level security;

create policy "user can read own sessions"
on public.task_sessions for select
using (auth.uid() = user_id);

create policy "user can insert own sessions"
on public.task_sessions for insert
with check (auth.uid() = user_id);

create policy "user can update own sessions"
on public.task_sessions for update
using (auth.uid() = user_id);

create policy "user can delete own sessions"
on public.task_sessions for delete
using (auth.uid() = user_id);
```

#### 3.2.3 calendar_accounts (stores Google tokens)
```
create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  scopes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_accounts_user
on public.calendar_accounts(user_id);

alter table public.calendar_accounts enable row level security;

create policy "user can read own calendar accounts"
on public.calendar_accounts for select
using (auth.uid() = user_id);

create policy "user can insert own calendar accounts"
on public.calendar_accounts for insert
with check (auth.uid() = user_id);

create policy "user can update own calendar accounts"
on public.calendar_accounts for update
using (auth.uid() = user_id);

create policy "user cannot delete calendar accounts via client"
on public.calendar_accounts for delete using (false);
```

> Note: For production, consider moving `access_token`/`refresh_token` to the Vault secrets API or encrypting at rest. The above is simplest to get started.

### 3.3 Store function secrets for Google + Vertex
You already set Vertex secrets in §1.7. Add Google Calendar OAuth secrets if not done:
```
supabase functions secrets set GOOGLE_CAL_CLIENT_ID="<your_client_id>" GOOGLE_CAL_CLIENT_SECRET="<your_client_secret>"
```

### 3.4 (Optional) Local development env
If you use the Supabase CLI locally:
```
supabase start
supabase functions serve
```
Ensure your redirect URI for local callback is present (see §2.3).

---

## 4) App: Connecting calendar from the UI

You will expose two links/buttons in Settings:
1. Connect Calendar → opens `https://<PROJECT_REF>.functions.supabase.co/calendar_proxy/oauth/start`
2. Disconnect Calendar → calls a function route to revoke and delete row in `calendar_accounts`.

### 4.1 OAuth start (what the function will do)
The Edge Function builds the Google auth URL:
- response_type=code
- access_type=offline
- prompt=consent
- scope=`calendar.readonly` (and optionally `calendar.events`)
- redirect_uri=`.../calendar_proxy/callback`

### 4.2 OAuth callback (what the function will do)
- Exchanges `code` for `access_token` + `refresh_token`
- Saves tokens in `calendar_accounts`
- Redirects back to your app (e.g., your deep link / settings screen) with success.

---

## 5) Vertex AI usage from Edge Functions (high-level)

Your `planner_v2` Edge Function will:
1. Read secrets: `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_SA_KEY`.
2. Create a Google-auth JWT for the service account and obtain an access token.
3. Call Gemini 2.5 Pro with `response_mime_type=application/json` and your strict schema.
4. Validate JSON, then return to the client or call the scheduler function directly.

You do not need to change anything here in the Console once secrets are set.

---

## 6) Verifying everything end-to-end

### 6.1 Smoke test: Calendar OAuth
1. In your app, click “Connect Google Calendar”.
2. Grant access. Confirm you see your Gmail in `public.calendar_accounts` with tokens.
3. Try a test `freebusy` call via your `calendar_proxy` function route: it should return busy intervals.

### 6.2 Smoke test: Vertex AI
1. Trigger a simple plan request.
2. In function logs, verify you receive valid JSON with tasks.
3. Confirm planner returns quickly (< 3s for small prompts) and schema validation passes.

### 6.3 Scheduler test
1. With busy slots present, attempt to schedule a few 30–60 min sessions.
2. Validate zero conflicts and placements within working hours.
3. Change preferences (e.g., weekends off) and verify outputs adjust.

---

## 7) Cost controls

- Keep planning horizon to 4–6 weeks.
- Cache `freebusy` results briefly (60–120s) per user.
- Prefer summaries of chat vs. sending raw long conversations.
- Low temperature (0.2–0.4) and strict schema reduce retries.

---

## 8) Troubleshooting

**Calendar consent failing**
- Ensure the account is added as a Test User in the OAuth consent screen.
- Confirm redirect URI matches exactly, including path and scheme.

**No refresh token**
- Must include `access_type=offline` and `prompt=consent` on the first authorization.
- If you previously granted access without offline, remove the app in `myaccount.google.com/permissions` and retry.

**Vertex 403 / permission denied**
- Service account missing `Vertex AI User` or `Service Account Token Creator`.
- Wrong project/region: ensure the secrets match the project where Vertex AI API is enabled.

**RLS insert blocked**
- Check that your function uses `auth.uid()` (if acting on behalf of a user) or that you use service role for server-side writes where appropriate.

---

## 9) What you do vs. what I do

You:
- Complete all steps in sections 1–3 (APIs, OAuth app, secrets, tables) — this guide.
- Add Settings UI buttons that call the provided function endpoints (I’ll wire endpoints and handlers).

I:
- Implement `planner_v2`, `schedule_v1`, and `calendar_proxy` Edge Functions.
- Add feature flag, preview grid, and fallback to existing AI.
- Validate schema, place sessions, and sync with DB.

Once you’ve finished your steps, ping me and I’ll proceed with deploying the functions and integrating the client.


