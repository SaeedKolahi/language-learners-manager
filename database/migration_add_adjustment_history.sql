-- Migration: Add adjustment_history field to learners table
-- Run this in Supabase SQL Editor if the field doesn't exist

ALTER TABLE learners 
ADD COLUMN IF NOT EXISTS adjustment_history TEXT;

