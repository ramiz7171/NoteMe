import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useEncryption } from '../../context/EncryptionContext'
import { useSecurity } from '../../context/SecurityContext'
import { supabase } from '../../lib/supabase'
import { logAuditEvent } from '../../lib/auditLog'
import CustomSelect from '../shared/CustomSelect'
import PinSetupModal from '../Security/PinSetupModal'
import MfaSetupModal from '../Security/MfaSetupModal'
import PasskeySetupSection from '../Security/PasskeySetupSection'
import RecoveryCodesModal from '../Security/RecoveryCodesModal'
import SessionList from '../Security/SessionList'
import AuditLogList from '../Security/AuditLogList'
import { generateRecoveryCodes, countRecoveryCodes } from '../../lib/recoveryCode'
import { inputClass, sectionTitle, cardClass } from './settingsStyles'

interface SecuritySectionProps {
  showToast: (msg: string) => void
}

export default function SecuritySection({ showToast }: SecuritySectionProps) {
  const { user } = useAuth()
  const {
    isEncryptionEnabled, isUnlocked, enableEncryption, disableEncryption,
    unlockEncryption,
  } = useEncryption()
  const {
    isPinEnabled, setupPin: _setupPin, removePin,
    idleTimeoutMinutes, setIdleTimeout,
  } = useSecurity()

  // ── Password ──
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

  return (
    <>
      {/* ── Security ── */}
      <div className={cardClass}>
        <h2 className={sectionTitle}>Security</h2>

        {/* Password */}
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Password</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Enter new password" autoComplete="new-password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
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

        {/* Recovery Codes */}
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
    </>
  )
}
