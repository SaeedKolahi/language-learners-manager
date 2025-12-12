-- Migration: Add status field to learners table
-- Run this in Supabase SQL Editor

ALTER TABLE learners 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_learners_status ON learners(status);

