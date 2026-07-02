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
