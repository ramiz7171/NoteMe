import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { verifyRecoveryCode } from '../../lib/recoveryCode'

interface MfaVerifyModalProps {
  factorId: string
  userId?: string
  onVerified: () => void
  onCancel: () => void
}

export default function MfaVerifyModal({ factorId, userId, onVerified, onCancel }: MfaVerifyModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')

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

    setLoading(false)
    if (verifyError) {
      setError('Invalid code. Please try again.')
      setCode('')
      return
    }

    onVerified()
  }

  const handleRecoveryVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      setError('Unable to verify. Please try again.')
      return
    }
    setError('')
    setLoading(true)

    const valid = await verifyRecoveryCode(userId, recoveryCode)
    setLoading(false)

    if (!valid) {
      setError('Invalid recovery code.')
      return
    }

    onVerified()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="w-80 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]">
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {useRecovery ? 'Enter one of your recovery codes' : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {useRecovery ? (
          <form onSubmit={handleRecoveryVerify} className="space-y-3">
            <input
              type="text"
              value={recoveryCode}
              onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-3 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="XXXX-XXXX"
              autoFocus
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || recoveryCode.length < 9}
              className="w-full py-2.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading ? 'Verifying...' : 'Use Recovery Code'}
            </button>

            <button
              type="button"
              onClick={() => { setUseRecovery(false); setError(''); setRecoveryCode('') }}
              className="w-full py-2 text-xs text-[var(--accent)] hover:underline transition-colors"
            >
              Back to authenticator code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="tel"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-3 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              maxLength={6}
              inputMode="numeric"
              placeholder="000000"
              autoFocus
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { setUseRecovery(true); setError(''); setCode('') }}
              className="w-full py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-[var(--accent)] transition-colors"
            >
              Lost your authenticator? Use a recovery code
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
