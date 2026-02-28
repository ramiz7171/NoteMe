-- =============================================================
-- CriptNote Security Features — SQL Migrations
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. SESSIONS TABLE
-- Tracks active user sessions for session management
CREATE TABLE IF NOT EXISTS sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  device_info text DEFAULT '',
  ip_address text DEFAULT '',
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON sessions FOR ALL
  USING (auth.uid() = user_id);

-- 2. AUDIT LOGS TABLE
-- Records security-relevant events for activity log
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}',
  device_info text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at DESC);

-- 3. SHARE PASSWORD COLUMN
-- Add password hash column to user_files for password-protected share links
ALTER TABLE user_files
  ADD COLUMN IF NOT EXISTS share_password_hash text DEFAULT NULL;

-- 4. RPC: SET SHARE PASSWORD
-- Hashes password server-side using pgcrypto (never expose hash to client)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_share_password(p_file_id uuid, p_password text)
RETURNS void AS $$
BEGIN
  IF p_password = '' OR p_password IS NULL THEN
    UPDATE user_files SET share_password_hash = NULL WHERE id = p_file_id;
  ELSE
    UPDATE user_files
    SET share_password_hash = crypt(p_password, gen_salt('bf'))
    WHERE id = p_file_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: VERIFY SHARE PASSWORD
-- Verifies password against stored hash (never exposes hash)
CREATE OR REPLACE FUNCTION verify_share_password(p_share_id text, p_password text)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT share_password_hash INTO stored_hash
  FROM user_files
  WHERE share_id = p_share_id;

  IF stored_hash IS NULL THEN
    RETURN true; -- No password set
  END IF;

  RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: GET SHARED FILE
-- Returns file info for public share page without exposing sensitive data
CREATE OR REPLACE FUNCTION get_shared_file(p_share_id text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', f.id,
    'file_name', f.file_name,
    'file_type', f.file_type,
    'file_size', f.file_size,
    'storage_path', f.storage_path,
    'share_id', f.share_id,
    'share_expires_at', f.share_expires_at,
    'password_protected', (f.share_password_hash IS NOT NULL),
    'created_at', f.created_at
  ) INTO result
  FROM user_files f
  WHERE f.share_id = p_share_id;

  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check expiration
  IF (result->>'share_expires_at') IS NOT NULL
    AND (result->>'share_expires_at')::timestamptz < now() THEN
    RETURN NULL; -- Expired
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
