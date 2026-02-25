import { useRef } from 'react'

interface BreadcrumbItem {
  id: string | null
  name: string
}

interface FileShareHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  viewMode: 'grid' | 'list'
  onToggleView: () => void
  onNewFolder: () => void
  onUploadFiles: (files: File[]) => void
  onNavigate: (folderId: string | null) => void
}

export default function FileShareHeader({
  breadcrumbs,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleView,
  onNewFolder,
  onUploadFiles,
  onNavigate,
}: FileShareHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="shrink-0 px-5 py-3 border-b border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-white/[0.03]">
      {/* Top row: title + view toggle */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">File Share</h1>
        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200/80 dark:border-white/10">
            <button
              onClick={() => viewMode !== 'grid' && onToggleView()}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => viewMode !== 'list' && onToggleView()}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--accent)] text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: actions + breadcrumbs + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Folder
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) onUploadFiles(files)
            e.target.value = ''
          }}
        />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              <button
                onClick={() => onNavigate(crumb.id)}
                className={`hover:text-[var(--accent)] transition-colors ${
                  i === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-white font-medium' : ''
                }`}
              >
                {i === 0 ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {crumb.name}
                  </span>
                ) : crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-52">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-shadow"
          />
        </div>
      </div>
    </div>
  )
}
