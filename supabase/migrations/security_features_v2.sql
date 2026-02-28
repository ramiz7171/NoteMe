-- =============================================================
-- CriptNote Security V2 — SQL Migrations
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. PASSKEYS TABLE
-- Stores WebAuthn credentials for biometric/security key unlock
CREATE TABLE IF NOT EXISTS passkeys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint DEFAULT 0,
  device_name text DEFAULT '',
  transports text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own passkeys"
  ON passkeys FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys (credential_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys (user_id);

-- 2. RECOVERY CODES TABLE
-- Stores bcrypt-hashed one-time recovery codes for 2FA bypass
CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash text NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery codes"
  ON recovery_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery codes"
  ON recovery_codes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes (user_id);

-- 3. RPC: GENERATE RECOVERY CODES
-- Generates 10 new one-time codes, returns plaintext (stored as bcrypt hashes)
CREATE OR REPLACE FUNCTION generate_recovery_codes(p_user_id uuid)
RETURNS text[] AS $$
DECLARE
  codes text[] := '{}';
  code text;
  i int;
BEGIN
  DELETE FROM recovery_codes WHERE user_id = p_user_id;

  FOR i IN 1..10 LOOP
    code := upper(
      substring(md5(gen_random_uuid()::text) from 1 for 4) || '-' ||
      substring(md5(gen_random_uuid()::text) from 1 for 4)
    );
    INSERT INTO recovery_codes (user_id, code_hash)
    VALUES (p_user_id, crypt(code, gen_salt('bf')));
    codes := codes || code;
  END LOOP;

  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: VERIFY RECOVERY CODE
-- Checks code against stored hashes. Single-use: marks as used if valid.
CREATE OR REPLACE FUNCTION verify_recovery_code(p_user_id uuid, p_code text)
RETURNS boolean AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id, code_hash FROM recovery_codes
    WHERE user_id = p_user_id AND used = false
  LOOP
    IF rec.code_hash = crypt(p_code, rec.code_hash) THEN
      UPDATE recovery_codes SET used = true WHERE id = rec.id;
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: COUNT REMAINING RECOVERY CODES
CREATE OR REPLACE FUNCTION count_recovery_codes(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (SELECT COUNT(*)::integer FROM recovery_codes WHERE user_id = p_user_id AND used = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SELF-DESTRUCTING NOTES: expires_at column
ALTER TABLE notes ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_expires_at
  ON notes (expires_at) WHERE expires_at IS NOT NULL;

-- Server-side cleanup function (call via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_notes()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notes WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
