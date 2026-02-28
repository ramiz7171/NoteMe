import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { UserFile } from '../../types'

type ExpiryOption = '24h' | '7d' | '30d' | 'never'

interface ShareLinkModalProps {
  file: UserFile
  onClose: () => void
  onGenerate: (fileId: string, expiresIn: ExpiryOption, password?: string) => Promise<string | null>
  onRevoke: (fileId: string) => void
}

export default function ShareLinkModal({ file, onClose, onGenerate, onRevoke }: ShareLinkModalProps) {
  const [expiry, setExpiry] = useState<ExpiryOption>('7d')
  const [shareUrl, setShareUrl] = useState<string | null>(
    file.share_id ? `${window.location.origin}/share/${file.share_id}` : null
  )
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    const url = await onGenerate(file.id, expiry, password || undefined)
    if (url) setShareUrl(url)
    setGenerating(false)
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = () => {
    onRevoke(file.id)
    setShareUrl(null)
  }

  const formatExpiry = () => {
    if (!file.share_expires_at) return 'Never expires'
    const date = new Date(file.share_expires_at)
    if (date.getTime() < Date.now()) return 'Expired'
    return `Expires ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[92vw] max-w-96 glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Share Link</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">
          {file.file_name}
        </p>

        {shareUrl ? (
          <>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-lg mb-3">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 dark:text-gray-300"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-2.5 py-1 text-[10px] font-medium bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatExpiry()}</p>
              {file.share_password_hash && (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  Password protected
                </span>
              )}
            </div>
            <button
              onClick={handleRevoke}
              className="w-full py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Revoke Link
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                Link Expiry
              </label>
              <div className="flex gap-2 mt-1.5">
                {([
                  { value: '24h', label: '24 hours' },
                  { value: '7d', label: '7 days' },
                  { value: '30d', label: '30 days' },
                  { value: 'never', label: 'Never' },
                ] as { value: ExpiryOption; label: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiry(opt.value)}
                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg border transition-colors ${
                      expiry === opt.value
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
                        : 'border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password protection */}
            <div className="mb-4">
              <label className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                Password (optional)
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Set a password to protect this link"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Link'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
