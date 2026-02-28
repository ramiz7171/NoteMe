import { useState } from 'react'
import { usePasskeys } from '../../hooks/usePasskeys'

export default function PasskeySetupSection() {
  const { passkeys, loading, isAvailable, registerPasskey, removePasskey } = usePasskeys()
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setError('')
    setRegistering(true)
    const result = await registerPasskey()
    setRegistering(false)
    if (result.error) setError(result.error)
  }

  if (!isAvailable) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Passkeys</span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Your browser does not support passkeys</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 7.439M12 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Passkeys</span>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Use biometrics or security key to unlock
          </p>
        </div>
        <button
          onClick={handleRegister}
          disabled={registering}
          className="px-3 py-1.5 text-[11px] font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {registering ? 'Registering...' : 'Register Passkey'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-2">
          <div className="animate-spin w-4 h-4 border-2 border-black dark:border-white border-t-transparent rounded-full" />
        </div>
      ) : passkeys.length > 0 ? (
        <div className="space-y-1.5">
          {passkeys.map(pk => (
            <div key={pk.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 7.439M12 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{pk.device_name || 'Passkey'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Added {new Date(pk.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removePasskey(pk.id)}
                className="text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 dark:text-gray-500">No passkeys registered yet</p>
      )}
    </div>
  )
}
