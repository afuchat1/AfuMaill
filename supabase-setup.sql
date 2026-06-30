-- ============================================================
-- AfuMail — Supabase setup SQL
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read usernames (for availability checks)
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- Authenticated users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Emails table (for future use — stores sent/received email metadata)
CREATE TABLE IF NOT EXISTS public.emails (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_name   TEXT NOT NULL,
  from_email  TEXT NOT NULL,
  to_emails   JSONB NOT NULL DEFAULT '[]',
  subject     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  preview     TEXT NOT NULL DEFAULT '',
  timestamp   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read        BOOLEAN DEFAULT FALSE,
  starred     BOOLEAN DEFAULT FALSE,
  pinned      BOOLEAN DEFAULT FALSE,
  attachments JSONB NOT NULL DEFAULT '[]',
  category    TEXT NOT NULL DEFAULT 'primary',
  folder      TEXT NOT NULL DEFAULT 'inbox',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
