import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSecurity } from '../../context/SecurityContext'

interface PinSetupModalProps {
  onClose: () => void
  mode: 'setup' | 'change'
}

export default function PinSetupModal({ onClose, mode }: PinSetupModalProps) {
  const { setupPin, unlockWithPin } = useSecurity()
  const [step, setStep] = useState<'verify' | 'enter' | 'confirm'>(mode === 'change' ? 'verify' : 'enter')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerifyCurrent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const valid = await unlockWithPin(currentPin)
    setLoading(false)
    if (valid) {
      setStep('enter')
    } else {
      setError('Incorrect current PIN')
    }
  }

  const handleEnterNew = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4-6 digits')
      return
    }
    if (!/^\d+$/.test(newPin)) {
      setError('PIN must contain only digits')
      return
    }
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    setLoading(true)
    await setupPin(newPin)
    setLoading(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-80 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {mode === 'setup' ? 'Set Up PIN' : 'Change PIN'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'verify' && (
          <form onSubmit={handleVerifyCurrent} className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter your current PIN</p>
            <input
              type="tel"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !currentPin} className="w-full py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-40">
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'enter' && (
          <form onSubmit={handleEnterNew} className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter a 4-6 digit PIN</p>
            <input
              type="tel"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={newPin.length < 4} className="w-full py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-40">
              Continue
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirm your PIN</p>
            <input
              type="tel"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || confirmPin.length < 4} className="w-full py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-40">
              {loading ? 'Setting...' : 'Set PIN'}
            </button>
          </form>
        )}

        <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 text-center">
          PIN is stored locally on this device only
        </p>
      </div>
    </div>,
    document.body
  )
}
