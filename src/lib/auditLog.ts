import { supabase } from './supabase'
import { parseUserAgent } from './parseUserAgent'
import { getCachedGeoLocation } from './geolocation'
import type { Json } from '../types'

export type AuditAction =
  | 'auth.login' | 'auth.logout' | 'auth.mfa_enable' | 'auth.mfa_disable'
  | 'auth.recovery_codes_generate' | 'auth.recovery_code_used'
  | 'auth.passkey_register' | 'auth.passkey_remove' | 'auth.passkey_unlock'
  | 'note.create' | 'note.update' | 'note.delete' | 'note.permanent_delete' | 'note.restore'
  | 'note.set_expiration'
  | 'file.upload' | 'file.delete' | 'file.share_create' | 'file.share_revoke'
  | 'settings.update' | 'settings.encryption_enable' | 'settings.encryption_disable'
  | 'settings.pin_enable' | 'settings.pin_disable'

export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const geo = await getCachedGeoLocation()
    const ua = parseUserAgent(navigator.userAgent)

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      details: {
        ...(details ?? {}),
        browser: ua.browser,
        os: ua.os,
        device: ua.device,
        ...(geo ? { city: geo.city, region: geo.region, country: geo.country } : {}),
      } as Json,
      device_info: navigator.userAgent,
    })
  } catch {
    // Fire-and-forget: don't let audit logging break app functionality
  }
}
