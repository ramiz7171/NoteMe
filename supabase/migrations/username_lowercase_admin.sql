-- ============================================================
-- Migration: Lowercase all usernames + set 'ramiz' as admin
-- ============================================================

-- 1. Convert all existing usernames to lowercase
UPDATE profiles SET username = LOWER(username) WHERE username <> LOWER(username);

-- 2. Add a CHECK constraint to enforce lowercase-only usernames going forward
ALTER TABLE profiles
  ADD CONSTRAINT username_lowercase_check CHECK (username = LOWER(username));

-- 3. Make user 'ramiz' an admin
-- First ensure is_admin column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

UPDATE profiles SET is_admin = true WHERE id = 'e2367a5a-8c5a-482b-bdcc-fe25c92dbf0d';
