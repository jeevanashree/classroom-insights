
-- Profiles table for auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Auth users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add user_id to meetings and participants
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS user_id UUID;

-- Require auth for meeting creation/updates
DROP POLICY IF EXISTS "Anyone can create meetings" ON public.meetings;
CREATE POLICY "Auth users create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update meetings" ON public.meetings;
CREATE POLICY "Auth users update meetings" ON public.meetings FOR UPDATE TO authenticated USING (true);

-- Require auth for participant join/updates
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.participants;
CREATE POLICY "Auth users join" ON public.participants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update participants" ON public.participants;
CREATE POLICY "Auth users update" ON public.participants FOR UPDATE TO authenticated USING (true);

-- Realtime on profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
