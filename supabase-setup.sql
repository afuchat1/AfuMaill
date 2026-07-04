-- ============================================================
-- AfuMail — Supabase setup SQL
-- Run this ONCE in your Supabase project → SQL Editor
-- ============================================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,
  recent_searches JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the profiles table already existed before this update, run:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recent_searches JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Emails table
CREATE TABLE IF NOT EXISTS public.emails (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_name    TEXT NOT NULL DEFAULT '',
  from_email   TEXT NOT NULL DEFAULT '',
  to_emails    JSONB NOT NULL DEFAULT '[]',
  cc_emails    JSONB NOT NULL DEFAULT '[]',
  subject      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  preview      TEXT NOT NULL DEFAULT '',
  timestamp    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  starred      BOOLEAN NOT NULL DEFAULT FALSE,
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  attachments  JSONB NOT NULL DEFAULT '[]',
  category     TEXT NOT NULL DEFAULT 'primary',
  folder       TEXT NOT NULL DEFAULT 'inbox',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own emails"
  ON public.emails FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own emails"
  ON public.emails FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own emails"
  ON public.emails FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own emails"
  ON public.emails FOR DELETE
  USING (auth.uid() = owner_id);

-- Index for fast inbox queries
CREATE INDEX IF NOT EXISTS emails_owner_folder_idx ON public.emails (owner_id, folder);
CREATE INDEX IF NOT EXISTS emails_owner_timestamp_idx ON public.emails (owner_id, timestamp DESC);

-- 3. OAuth 2.1 / OIDC identity-provider tables
-- AfuMail is the identity provider for the whole Afu ecosystem. Any Afu app
-- (or third party) can register a client here and use standard
-- Authorization Code + PKCE to let a user sign in with their AfuMail account.
CREATE TABLE IF NOT EXISTS public.oauth_clients (
  client_id           TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  logo_url            TEXT,
  redirect_uris       JSONB NOT NULL DEFAULT '[]'::jsonb,
  scopes              JSONB NOT NULL DEFAULT '["profile","email"]'::jsonb,
  is_first_party      BOOLEAN NOT NULL DEFAULT false,
  -- Self-service developer registration (Developer Dashboard). NULL for
  -- first-party/seeded clients that predate self-service registration.
  owner_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'public' clients (mobile/SPA) authenticate with PKCE only, per OAuth 2.1.
  -- 'confidential' clients (server-side apps) must also present client_secret.
  client_type         TEXT NOT NULL DEFAULT 'public' CHECK (client_type IN ('public', 'confidential')),
  -- SHA-256 hex digest of the client secret. Only set for confidential
  -- clients. The plaintext secret is shown to the developer exactly once
  -- (at creation or rotation) and is never stored or retrievable again.
  client_secret_hash  TEXT,
  -- Lets AfuMail suspend an abusive or compromised app without deleting its
  -- registration or the developer's ownership record.
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_clients_owner_idx ON public.oauth_clients (owner_id);

CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  code                    TEXT PRIMARY KEY,
  client_id               TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri            TEXT NOT NULL,
  code_challenge          TEXT NOT NULL,
  code_challenge_method   TEXT NOT NULL DEFAULT 'S256',
  scope                   TEXT NOT NULL DEFAULT 'profile email',
  expires_at              TIMESTAMPTZ NOT NULL,
  used                    BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  access_token        TEXT PRIMARY KEY,
  refresh_token       TEXT UNIQUE NOT NULL,
  client_id           TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope               TEXT NOT NULL DEFAULT 'profile email',
  access_expires_at   TIMESTAMPTZ NOT NULL,
  refresh_expires_at  TIMESTAMPTZ NOT NULL,
  revoked             BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_tokens_user_client_idx ON public.oauth_tokens (user_id, client_id) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS oauth_codes_expires_idx ON public.oauth_authorization_codes (expires_at);

-- All writes to these three tables go through the api-server using the
-- Supabase service-role key, never directly from the client — including
-- developer app registration (POST/PATCH/DELETE /api/developer/apps/*),
-- which validates ownership server-side before touching the database. RLS
-- is enabled with no INSERT/UPDATE/DELETE policies for anon/authenticated
-- roles, so a browser or mobile client can never mint or forge its own
-- tokens/codes, or edit another developer's app registration.
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients are publicly readable"
  ON public.oauth_clients FOR SELECT
  USING (true);

-- Seed a demo client used by the in-app OAuth demo (Settings → Connected
-- Accounts → "Try the OAuth demo"). Register real Afu apps the same way.
INSERT INTO public.oauth_clients (client_id, name, logo_url, redirect_uris, scopes, is_first_party)
VALUES (
  'afumail-demo-app',
  'AfuMail OAuth Demo',
  NULL,
  '["afumail://oauth/demo-callback", "https://mail.afuchat.com/oauth/demo-callback"]'::jsonb,
  '["profile","email"]'::jsonb,
  true
)
ON CONFLICT (client_id) DO UPDATE SET redirect_uris = EXCLUDED.redirect_uris;
