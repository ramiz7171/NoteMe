import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { createPasskeyCredential, verifyPasskeyCredential, isWebAuthnAvailable } from '../lib/webauthn'
import { logAuditEvent } from '../lib/auditLog'

export interface Passkey {
  id: string
  credential_id: string
  device_name: string
  created_at: string
}

export function usePasskeys() {
  const { user, profile } = useAuth()
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPasskeys = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('passkeys')
      .select('id, credential_id, device_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPasskeys(data as Passkey[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPasskeys()
  }, [fetchPasskeys])

  const registerPasskey = useCallback(async (deviceName?: string): Promise<{ error: string | null }> => {
    if (!user || !profile) return { error: 'Not authenticated' }
    if (!isWebAuthnAvailable()) return { error: 'WebAuthn is not supported in this browser' }

    const result = await createPasskeyCredential(user.id, profile.username)
    if (!result) return { error: 'Passkey registration was cancelled or failed' }

    const { error } = await supabase.from('passkeys').insert({
      user_id: user.id,
      credential_id: result.credentialId,
      public_key: result.publicKey,
      device_name: deviceName || detectDeviceName(),
      transports: result.transports,
    })

    if (error) return { error: error.message }

    await fetchPasskeys()
    logAuditEvent(user.id, 'auth.passkey_register')
    return { error: null }
  }, [user, profile, fetchPasskeys])

  const removePasskey = useCallback(async (id: string) => {
    if (!user) return
    setPasskeys(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('passkeys').delete().eq('id', id)
    if (error) fetchPasskeys()
    else logAuditEvent(user.id, 'auth.passkey_remove')
  }, [user, fetchPasskeys])

  const verifyPasskey = useCallback(async (): Promise<boolean> => {
    if (!user || passkeys.length === 0) return false
    const credentialIds = passkeys.map(p => p.credential_id)
    const result = await verifyPasskeyCredential(credentialIds)
    if (result.ok && user) {
      logAuditEvent(user.id, 'auth.passkey_unlock')
    }
    return result.ok
  }, [user, passkeys])

  return {
    passkeys,
    loading,
    isAvailable: isWebAuthnAvailable(),
    hasPasskeys: passkeys.length > 0,
    registerPasskey,
    removePasskey,
    verifyPasskey,
  }
}

function detectDeviceName(): string {
  const ua = navigator.userAgent
  if (/Macintosh/i.test(ua)) return 'Mac Touch ID'
  if (/Windows/i.test(ua)) return 'Windows Hello'
  if (/Android/i.test(ua)) return 'Android Biometric'
  if (/iPhone|iPad/i.test(ua)) return 'iPhone Face ID'
  if (/Linux/i.test(ua)) return 'Linux Device'
  return 'Security Key'
}
