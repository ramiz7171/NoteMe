import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Logo from '../Logo'

type AuthMode = 'login' | 'signup' | 'magic-link'

export default function LoginForm() {
  const { signIn, signUp, signInWithMagicLink } = useAuth()
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
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-gradient px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
            Your notes, beautifully organized.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-xl">
          {/* Mode Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100/80 dark:bg-white/5 rounded-xl p-1">
            {([['login', 'Sign In'], ['signup', 'Sign Up'], ['magic-link', 'Magic Link']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setMode(key); setError(''); setMessage('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === key
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                  placeholder="Choose a username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'magic-link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                  placeholder="Min. 6 characters"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
                {error}
              </div>
            )}

            {message && (
              <div className="text-sm text-green-500 bg-green-50 dark:bg-green-500/10 rounded-xl p-3">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black dark:bg-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black font-medium rounded-xl transition-all"
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
      </div>
    </div>
  )
}
