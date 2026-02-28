import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateRecoveryCodes } from '../../lib/recoveryCode'
import RecoveryCodesModal from './RecoveryCodesModal'

interface MfaSetupModalProps {
  onClose: () => void
  onComplete: () => void
}

export default function MfaSetupModal({ onClose, onComplete }: MfaSetupModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'enroll' | 'verify' | 'recovery'>('enroll')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  useState(() => {
    const enroll = async () => {
      setLoading(true)
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CriptNote',
      })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      if (data) {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
        setStep('verify')
      }
    }
    enroll()
  })

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setError('Invalid code. Please try again.')
      setLoading(false)
      return
    }

    // Generate recovery codes after successful TOTP verification
    if (user) {
      try {
        const codes = await generateRecoveryCodes(user.id)
        setRecoveryCodes(codes)
        setStep('recovery')
      } catch {
        onComplete()
      }
    } else {
      onComplete()
    }
    setLoading(false)
  }

  if (step === 'recovery') {
    return (
      <RecoveryCodesModal
        codes={recoveryCodes}
        onConfirm={onComplete}
        onClose={onComplete}
      />
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[92vw] max-w-96 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Set Up Two-Factor Authentication</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'enroll' && loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full" />
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            {qrCode && (
              <div className="flex justify-center p-3 bg-white rounded-lg">
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Can't scan? Enter this code manually:</p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all select-all">{secret}</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter 6-digit code from your app
                </label>
                <input
                  type="tel"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </form>
          </div>
        )}

        {error && step === 'enroll' && !loading && (
          <div className="text-sm text-red-500 text-center py-4">{error}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
