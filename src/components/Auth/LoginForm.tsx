import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import FingerprintLogo from './FingerprintLogo'
import MfaVerifyModal from '../Security/MfaVerifyModal'

type AuthMode = 'login' | 'signup' | 'magic-link'

export default function LoginForm() {
  const { user, signIn, signUp, signInWithMagicLink, mfaRequired, mfaFactorId, clearMfa } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'magic-link') {
      const { error } = await signInWithMagicLink(email)
      if (error) setError(error.message)
      else setMessage('Check your email for a magic link!')
    } else if (mode === 'signup') {
      const { error } = await signUp(email, password, username)
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const result = await signIn(email, password)
      if (result.error) setError(result.error.message)
    }

    setLoading(false)
  }

  const handleMfaVerified = () => {
    // MFA verified, auth state change will redirect to dashboard
  }

  const handleMfaCancel = () => {
    clearMfa()
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8 animate-[fadeInUp_0.8s_ease-out_both]">
        <FingerprintLogo />
        <h1 className="text-2xl font-bold text-white mt-2 tracking-tight">
          CriptNote
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          You script, we encrypt.
        </p>
      </div>

      {/* Card */}
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 sm:p-8 shadow-[0_0_40px_rgba(118,134,255,0.06)] animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        {/* Mode Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.06] rounded-xl p-1">
          {([['login', 'Sign In'], ['signup', 'Sign Up'], ['magic-link', 'Magic Link']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setMode(key); setError(''); setMessage('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === key
                  ? 'bg-white/[0.12] text-white shadow-sm shadow-black/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="animate-[fadeInUp_0.3s_ease-out_both]">
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                required
                className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all duration-200"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div className="animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'magic-link' && (
            <div className="animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all duration-200"
                placeholder="Min. 6 characters"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-[fadeInUp_0.3s_ease-out_both]">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-[fadeInUp_0.3s_ease-out_both]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-black font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(118,134,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none animate-[fadeInUp_0.6s_ease-out_0.5s_both]"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Magic Link'}
          </button>
        </form>
      </div>

      {/* Back link */}
      <div className="text-center mt-6 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
        >
          &larr; Back to home
        </a>
      </div>

      {mfaRequired && mfaFactorId && (
        <MfaVerifyModal
          factorId={mfaFactorId}
          userId={user?.id}
          onVerified={handleMfaVerified}
          onCancel={handleMfaCancel}
        />
      )}
    </>
  )
}
