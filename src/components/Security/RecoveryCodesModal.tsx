import { useState } from 'react'
import { createPortal } from 'react-dom'

interface RecoveryCodesModalProps {
  codes: string[]
  onConfirm: () => void
  onClose: () => void
}

export default function RecoveryCodesModal({ codes, onConfirm, onClose }: RecoveryCodesModalProps) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = `CriptNote Recovery Codes\n${'='.repeat(30)}\n\nKeep these codes in a safe place.\nEach code can only be used once.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'criptnote-recovery-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[420px] glass-panel-solid rounded-xl shadow-2xl p-5 animate-[scaleIn_0.15s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Save Your Recovery Codes</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            These codes can only be shown once. Save them in a safe place. Each code can be used once to sign in if you lose access to your authenticator app.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
          {codes.map((code, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}.</span>
              <code className="text-xs font-mono text-gray-800 dark:text-gray-200 tracking-wider">{code}</code>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 text-xs font-medium border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2 text-xs font-medium border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Download .txt
          </button>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={saved}
            onChange={e => setSaved(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">I have saved my recovery codes</span>
        </label>

        <button
          onClick={onConfirm}
          disabled={!saved}
          className="w-full py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  )
}
