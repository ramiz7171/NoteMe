import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useEncryption } from '../context/EncryptionContext'
import { useSecurity } from '../context/SecurityContext'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../lib/supabase'
import { getDailyUsage, AI_LIMITS } from '../lib/gemini'
import { logAuditEvent } from '../lib/auditLog'
import ToggleSwitch from '../components/shared/ToggleSwitch'
import CustomSelect from '../components/shared/CustomSelect'
import PinSetupModal from '../components/Security/PinSetupModal'
import MfaSetupModal from '../components/Security/MfaSetupModal'
import PasskeySetupSection from '../components/Security/PasskeySetupSection'
import RecoveryCodesModal from '../components/Security/RecoveryCodesModal'
import SessionList from '../components/Security/SessionList'
import AuditLogList from '../components/Security/AuditLogList'
import { generateRecoveryCodes, countRecoveryCodes } from '../lib/recoveryCode'
import type { NotificationSettings } from '../types'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings, loading, updateSettings } = useSettings()
  const {
    isEncryptionEnabled, isUnlocked, enableEncryption, disableEncryption,
    unlockEncryption,
  } = useEncryption()
  const {
    isPinEnabled, setupPin: _setupPin, removePin,
    idleTimeoutMinutes, setIdleTimeout,
  } = useSecurity()

  // ── Toast ──
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])

  // ── Profile ──
  const [displayName, setDisplayName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name)
  }, [profile])

  const saveDisplayName = async () => {
    if (!user || !displayName.trim()) return
    setProfileSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)
    setProfileSaving(false)
    if (!error) showToast('Settings saved')
  }

  // ── Security: Password ──
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  // ── Encryption ──
  const [encPassphrase, setEncPassphrase] = useState('')
  const [encConfirm, setEncConfirm] = useState('')
  const [encProgress, setEncProgress] = useState<number | null>(null)
  const [encError, setEncError] = useState('')
  const [encUnlockPass, setEncUnlockPass] = useState('')

  const handleEnableEncryption = async () => {
    if (encPassphrase.length < 8) {
      setEncError('Passphrase must be at least 8 characters.')
      return
    }
    if (encPassphrase !== encConfirm) {
      setEncError('Passphrases do not match.')
      return
    }
    setEncError('')
    setEncProgress(0)
    await enableEncryption(encPassphrase, setEncProgress)
    if (user) logAuditEvent(user.id, 'settings.encryption_enable')
    setEncPassphrase('')
    setEncConfirm('')
    setEncProgress(null)
    showToast('Encryption enabled')
  }

  const handleDisableEncryption = async () => {
    setEncError('')
    setEncProgress(0)
    try {
      await disableEncryption(encPassphrase, setEncProgress)
      if (user) logAuditEvent(user.id, 'settings.encryption_disable')
      setEncPassphrase('')
      setEncProgress(null)
      showToast('Encryption disabled')
    } catch {
      setEncError('Failed to decrypt. Check your passphrase.')
      setEncProgress(null)
    }
  }

  const handleUnlockEncryption = async () => {
    const ok = await unlockEncryption(encUnlockPass)
    if (ok) {
      setEncUnlockPass('')
      showToast('Encryption unlocked')
    } else {
      setEncError('Incorrect passphrase')
    }
  }

  // ── PIN ──
  const [showPinModal, setShowPinModal] = useState<'setup' | 'change' | null>(null)

  // ── MFA ──
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(true)

  // ── Recovery Codes ──
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [recoveryCount, setRecoveryCount] = useState<number | null>(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  useEffect(() => {
    if (!user || !mfaEnabled) return
    countRecoveryCodes(user.id).then(setRecoveryCount)
  }, [user, mfaEnabled])

  const handleRegenerateRecoveryCodes = async () => {
    if (!user) return
    setRecoveryLoading(true)
    try {
      const codes = await generateRecoveryCodes(user.id)
      setRecoveryCodes(codes)
      setShowRecoveryCodes(true)
      setRecoveryCount(codes.length)
      logAuditEvent(user.id, 'auth.recovery_codes_generate')
    } catch {
      showToast('Failed to generate recovery codes')
    }
    setRecoveryLoading(false)
  }

  useEffect(() => {
    const checkMfa = async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        setMfaEnabled((data?.totp && data.totp.length > 0) ?? false)
      } catch {
        // MFA not available
      }
      setMfaLoading(false)
    }
    checkMfa()
  }, [])

  const handleDisableMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    if (data?.totp && data.totp.length > 0) {
      await supabase.auth.mfa.unenroll({ factorId: data.totp[0].id })
      setMfaEnabled(false)
      if (user) logAuditEvent(user.id, 'auth.mfa_disable')
      showToast('2FA disabled')
    }
  }

  // ── AI Usage ──
  const [aiUsage, setAiUsage] = useState<Record<string, { used: number; limit: number }>>({})

  useEffect(() => {
    if (!user) return
    const features = [
      { key: 'summarize', limit: AI_LIMITS.summarize.daily },
      { key: 'grammar', limit: AI_LIMITS.grammar.daily },
      { key: 'transcript', limit: AI_LIMITS.transcript.daily },
      { key: 'meeting_notes', limit: AI_LIMITS.meeting_notes.daily },
    ]
    const usage: Record<string, { used: number; limit: number }> = {}
    for (const f of features) {
      const { used } = getDailyUsage(f.key, user.id, f.limit)
      usage[f.key] = { used, limit: f.limit }
    }
    setAiUsage(usage)
  }, [user])

  // ── Helpers ──
  const handleSettingsUpdate = async (updates: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(updates)
    showToast('Settings saved')
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return
    handleSettingsUpdate({
      notifications: { ...settings.notifications, [key]: value },
    })
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-colors'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const sectionTitle = 'text-base font-bold text-gray-900 dark:text-white mb-4'
  const cardClass = 'bg-white dark:bg-white/[0.06] rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm'

  return (
    <div className="flex-1 h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

        {/* ── Profile Section ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Profile</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder="Your display name"
                />
                <button
                  onClick={saveDisplayName}
                  disabled={profileSaving || displayName.trim() === (profile?.display_name ?? '')}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity shrink-0"
                >
                  {profileSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={user?.email ?? ''} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={profile?.username ?? ''} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          </div>
        </div>

        {/* ── AI Preferences ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>AI Preferences</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Tone</label>
              <CustomSelect
                value={settings.ai_tone}
                onChange={val => handleSettingsUpdate({ ai_tone: val as typeof settings.ai_tone })}
                options={[
                  { value: 'professional', label: 'Professional' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'concise', label: 'Concise' },
                  { value: 'detailed', label: 'Detailed' },
                ]}
                size="md"
              />
            </div>
            <div>
              <label className={labelClass}>Summary Length</label>
              <CustomSelect
                value={settings.summary_length}
                onChange={val => handleSettingsUpdate({ summary_length: val as typeof settings.summary_length })}
                options={[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Long' },
                ]}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* ── Appearance ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Appearance</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Currently using {theme} theme</p>
              </div>
              <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Default View</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{settings.default_view === 'grid' ? 'Grid view' : 'Tab view'}</p>
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => handleSettingsUpdate({ default_view: 'grid' })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.default_view === 'grid' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >Grid</button>
                <button
                  onClick={() => handleSettingsUpdate({ default_view: 'list' })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.default_view === 'list' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >List</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Notifications</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Preferences saved — delivery coming soon</p>
          <div className="flex flex-col gap-4">
            <ToggleSwitch checked={settings.notifications?.email_summaries ?? false} onChange={v => handleNotificationChange('email_summaries', v)} label="Email Summaries" />
            <ToggleSwitch checked={settings.notifications?.meeting_reminders ?? false} onChange={v => handleNotificationChange('meeting_reminders', v)} label="Meeting Reminders" />
            <ToggleSwitch checked={settings.notifications?.transcript_ready ?? false} onChange={v => handleNotificationChange('transcript_ready', v)} label="Transcript Ready" />
          </div>
        </div>

        {/* ── Encryption ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              End-to-End Encryption
            </span>
          </h2>

          {isEncryptionEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Encryption {isUnlocked ? 'active' : 'locked'}
                </span>
              </div>

              {!isUnlocked && (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={encUnlockPass}
                    onChange={e => setEncUnlockPass(e.target.value)}
                    className={inputClass}
                    placeholder="Enter passphrase to unlock"
                  />
                  <button onClick={handleUnlockEncryption} className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40">
                    Unlock
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Enter your passphrase to disable encryption and decrypt all data:</p>
                <input
                  type="password"
                  value={encPassphrase}
                  onChange={e => setEncPassphrase(e.target.value)}
                  className={inputClass}
                  placeholder="Enter passphrase"
                />
                {encProgress !== null && (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${encProgress}%` }} />
                  </div>
                )}
                {encError && <p className="text-xs text-red-500 mt-1">{encError}</p>}
                <button onClick={handleDisableEncryption} disabled={!encPassphrase || encProgress !== null} className="mt-2 px-4 py-2 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                  Disable Encryption
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Encrypt your notes and files with a passphrase. Only you can access your data.
              </p>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  If you forget your passphrase, encrypted data cannot be recovered.
                </p>
              </div>
              <input
                type="password"
                value={encPassphrase}
                onChange={e => setEncPassphrase(e.target.value)}
                className={inputClass}
                placeholder="Choose a passphrase (min. 8 characters)"
              />
              <input
                type="password"
                value={encConfirm}
                onChange={e => setEncConfirm(e.target.value)}
                className={inputClass}
                placeholder="Confirm passphrase"
              />
              {encProgress !== null && (
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${encProgress}%` }} />
                </div>
              )}
              {encError && <p className="text-xs text-red-500">{encError}</p>}
              <button onClick={handleEnableEncryption} disabled={!encPassphrase || !encConfirm || encProgress !== null} className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity">
                {encProgress !== null ? `Encrypting... ${encProgress}%` : 'Enable Encryption'}
              </button>
            </div>
          )}
        </div>

        {/* ── Security ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Security</h2>

          {/* Password */}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4 mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Password</p>
            <div>
              <label className={labelClass}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Enter new password" autoComplete="new-password" />
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Confirm new password" autoComplete="new-password" />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{passwordMsg.text}</p>
            )}
            <button type="submit" disabled={passwordSaving || !newPassword || !confirmPassword} className="self-start px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity">
              {passwordSaving ? 'Updating...' : 'Change Password'}
            </button>
          </form>

          {/* Auto-Lock */}
          <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Lock</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Lock app after inactivity</p>
            </div>
            <CustomSelect
              value={String(idleTimeoutMinutes)}
              onChange={val => setIdleTimeout(Number(val))}
              options={[
                { value: '0', label: 'Off' },
                { value: '1', label: '1 min' },
                { value: '5', label: '5 min' },
                { value: '15', label: '15 min' },
                { value: '30', label: '30 min' },
              ]}
              size="sm"
            />
          </div>

          {/* PIN Lock */}
          <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN Lock</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {isPinEnabled ? 'PIN is set (device-local)' : 'Quick unlock with a PIN'}
              </p>
            </div>
            <div className="flex gap-2">
              {isPinEnabled ? (
                <>
                  <button onClick={() => setShowPinModal('change')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Change
                  </button>
                  <button onClick={() => { removePin(); if (user) logAuditEvent(user.id, 'settings.pin_disable'); showToast('PIN removed') }} className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Remove
                  </button>
                </>
              ) : (
                <button onClick={() => setShowPinModal('setup')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  Set Up PIN
                </button>
              )}
            </div>
          </div>

          {/* Two-Factor Auth */}
          <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Two-Factor Authentication</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {mfaEnabled ? '2FA is enabled' : 'Add an extra layer of security'}
              </p>
            </div>
            {mfaLoading ? (
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            ) : mfaEnabled ? (
              <button onClick={handleDisableMfa} className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Disable
              </button>
            ) : (
              <button onClick={() => setShowMfaSetup(true)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                Enable 2FA
              </button>
            )}
          </div>

          {/* Recovery Codes (visible only when MFA enabled) */}
          {mfaEnabled && (
            <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-white/10">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recovery Codes</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {recoveryCount !== null ? `${recoveryCount} codes remaining` : 'Backup codes for 2FA'}
                </p>
              </div>
              <button
                onClick={handleRegenerateRecoveryCodes}
                disabled={recoveryLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                {recoveryLoading ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          )}

          {/* Passkeys */}
          <div className="py-4 border-t border-gray-200 dark:border-white/10">
            <PasskeySetupSection />
          </div>
        </div>

        {/* ── Active Sessions ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Active Sessions</h2>
          <SessionList />
        </div>

        {/* ── Activity Log ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Activity Log</h2>
          <AuditLogList />
        </div>

        {/* ── Account Info ── */}
        <div className={cardClass}>
          <h2 className={sectionTitle}>Account Info</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Member since</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '--'}
              </span>
            </div>
            {profile?.is_admin && (
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white">
                  Admin
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Usage Today</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'summarize', label: 'Summarize' },
                  { key: 'grammar', label: 'Grammar' },
                  { key: 'transcript', label: 'Transcript' },
                  { key: 'meeting_notes', label: 'Meeting Notes' },
                ].map(({ key, label }) => {
                  const usage = aiUsage[key]
                  const used = usage?.used ?? 0
                  const limit = usage?.limit ?? 0
                  const isAdmin = profile?.is_admin ?? false
                  const pct = isAdmin ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0
                  return (
                    <div key={key} className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{used} / {isAdmin ? '\u221E' : limit}</p>
                      {!isAdmin && (
                        <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-black dark:bg-white transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Modals */}
      {showPinModal && (
        <PinSetupModal
          mode={showPinModal}
          onClose={() => {
            setShowPinModal(null)
            if (user) logAuditEvent(user.id, 'settings.pin_enable')
            showToast(showPinModal === 'setup' ? 'PIN set' : 'PIN changed')
          }}
        />
      )}

      {showMfaSetup && (
        <MfaSetupModal
          onClose={() => setShowMfaSetup(false)}
          onComplete={() => {
            setShowMfaSetup(false)
            setMfaEnabled(true)
            if (user) logAuditEvent(user.id, 'auth.mfa_enable')
            showToast('2FA enabled')
          }}
        />
      )}

      {showRecoveryCodes && recoveryCodes.length > 0 && (
        <RecoveryCodesModal
          codes={recoveryCodes}
          onConfirm={() => {
            setShowRecoveryCodes(false)
            setRecoveryCodes([])
            showToast('Recovery codes saved')
          }}
          onClose={() => {
            setShowRecoveryCodes(false)
            setRecoveryCodes([])
          }}
        />
      )}
    </div>
  )
}
