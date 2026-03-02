import { useState } from 'react'
import { useSecurity } from '../../context/SecurityContext'
import Logo from '../Logo'

export default function LockScreen() {
  const { isPinEnabled, isPasskeyEnabled, unlockWithPin, unlockWithPassword, unlockWithPasskey } = useSecurity()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usePassword, setUsePassword] = useState(!isPinEnabled)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let success: boolean
    if (usePassword) {
      success = await unlockWithPassword(input)
    } else {
      success = await unlockWithPin(input)
    }

    if (!success) {
      setError(usePassword ? 'Incorrect password' : 'Incorrect PIN')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-gradient px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          <div className="mt-4 w-16 h-16 mx-auto rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">App locked</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {usePassword ? 'Password' : 'PIN'}
              </label>
              <input
                type={usePassword ? 'password' : 'tel'}
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow text-center text-lg tracking-widest"
                placeholder={usePassword ? 'Enter password' : 'Enter PIN'}
                maxLength={usePassword ? undefined : 6}
                inputMode={usePassword ? undefined : 'numeric'}
                pattern={usePassword ? undefined : '[0-9]*'}
                autoFocus
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !input}
              className="w-full py-2.5 bg-black dark:bg-white hover:opacity-90 disabled:opacity-50 text-white dark:text-black font-medium rounded-xl transition-all"
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </button>
          </form>

          {isPinEnabled && (
            <button
              onClick={() => { setUsePassword(!usePassword); setInput(''); setError('') }}
              className="w-full mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {usePassword ? 'Use PIN instead' : 'Use password instead'}
            </button>
          )}

          {isPasskeyEnabled && (
            <button
              onClick={async () => {
                setPasskeyLoading(true)
                setError('')
                const ok = await unlockWithPasskey()
                if (!ok) setError('Passkey verification failed')
                setPasskeyLoading(false)
              }}
              disabled={passkeyLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 border border-gray-200/50 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 7.439M12 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {passkeyLoading ? 'Verifying...' : 'Unlock with Passkey'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
