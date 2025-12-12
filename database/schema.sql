-- Database Schema for Language Learners Management System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  chat_id TEXT,
  telegram_token TEXT DEFAULT 'REMOVED_TELEGRAM_TOKEN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: learners
CREATE TABLE IF NOT EXISTS learners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  age TEXT,
  level TEXT,
  goal TEXT,
  occupation TEXT,
  notes TEXT,
  status TEXT,
  has_installment BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  total_amount INTEGER,
  installment_count INTEGER,
  installment_amount INTEGER,
  adjustment_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: installments
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  learner_name TEXT NOT NULL,
  phone TEXT,
  amount INTEGER NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'در انتظار',
  payment_date TEXT,
  payment_note TEXT,
  installment_note TEXT,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  learner_name TEXT NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  sent BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_learners_user_id ON learners(user_id);
CREATE INDEX IF NOT EXISTS idx_learners_status ON learners(status);
CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_learner_id ON installments(learner_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_at ON reminders(reminder_at);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete_own" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for learners
CREATE POLICY "learners_select_own" ON learners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "learners_insert_own" ON learners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "learners_update_own" ON learners
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "learners_delete_own" ON learners
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for installments
CREATE POLICY "installments_select_own" ON installments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "installments_insert_own" ON installments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "installments_update_own" ON installments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "installments_delete_own" ON installments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY "reminders_select_own" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reminders_insert_own" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminders_update_own" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reminders_delete_own" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_learners_updated_at
  BEFORE UPDATE ON learners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

