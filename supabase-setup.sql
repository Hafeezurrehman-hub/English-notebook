-- =============================================
-- EnglishNotebook — Supabase Database Setup
-- Run this in SQL Editor
-- =============================================

-- 1. Users profile table (extends Supabase auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free',          -- 'free' | 'basic' | 'pro'
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments table (manual payment records)
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,           -- in PKR
  method TEXT NOT NULL,              -- 'jazzcash' | 'easypaisa' | 'bank'
  transaction_id TEXT,               -- student ka transaction ID
  screenshot_url TEXT,               -- screenshot upload
  plan TEXT NOT NULL,                -- 'basic' | 'pro'
  duration_months INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT
);

-- 3. Progress table (cloud sync)
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  attempted BOOLEAN DEFAULT FALSE,
  correct BOOLEAN DEFAULT FALSE,
  user_value TEXT,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id, question_id)
);

-- =============================================
-- Row Level Security (RLS) — very important!
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Profiles: user apna khud dekh sake
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Payments: user apni payments dekhe
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Progress: user apna progress
CREATE POLICY "Users can manage own progress"
  ON progress FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Auto-create profile when user signs up
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Admin view (you can see all payments)
-- =============================================

CREATE VIEW admin_payments AS
SELECT
  p.id,
  p.status,
  p.method,
  p.amount,
  p.plan,
  p.transaction_id,
  p.submitted_at,
  p.reviewed_at,
  p.admin_note,
  pr.full_name,
  pr.email,
  pr.plan AS current_plan
FROM payments p
JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.submitted_at DESC;
