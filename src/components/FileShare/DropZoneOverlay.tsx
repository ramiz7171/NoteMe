export default function DropZoneOverlay() {
  return (
    <div className="absolute inset-0 z-[9990] flex items-center justify-center bg-[var(--accent)]/5 backdrop-blur-sm border-2 border-dashed border-[var(--accent)] rounded-xl m-2 animate-[fadeIn_0.15s_ease-out]"
      style={{ animation: 'dropZonePulse 2s ease-in-out infinite, fadeIn 0.15s ease-out' }}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--accent)]">Drop files here to upload</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Release to start uploading</p>
      </div>
    </div>
  )
}
