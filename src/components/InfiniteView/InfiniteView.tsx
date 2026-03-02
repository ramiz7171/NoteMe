import { useMemo, useCallback, useState } from 'react'
import InfiniteMenu, { type MenuItem } from './InfiniteMenu'
import type { Note } from '../../types'

/* ── Generate a colored disc image for a note ── */
const imageCache = new Map<string, string>()

function generateNoteDiscImage(note: Note, size = 512): string {
  const key = `${note.id}_${note.title}_${note.color}`
  const cached = imageCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Background circle
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = note.color || '#6366f1'
  ctx.fill()

  // Slightly darker inner ring for depth
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.08)')
  grad.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.fillStyle = grad
  ctx.fill()

  // Title text
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const fontSize = Math.floor(size / 10)
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`

  const maxWidth = size * 0.65
  const words = (note.title || 'Untitled').split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = test
    }
  }
  if (currentLine) lines.push(currentLine)

  const displayLines = lines.slice(0, 3)
  if (lines.length > 3) displayLines[2] = displayLines[2] + '...'

  const lineHeight = fontSize * 1.3
  const startY = size / 2 - ((displayLines.length - 1) * lineHeight) / 2

  displayLines.forEach((line, i) => {
    ctx.fillText(line, size / 2, startY + i * lineHeight, maxWidth)
  })

  // Note type badge
  if (note.note_type && note.note_type !== 'basic') {
    const badgeFontSize = Math.floor(size / 16)
    ctx.font = `${badgeFontSize}px system-ui, -apple-system, sans-serif`
    ctx.globalAlpha = 0.6
    ctx.fillText(note.note_type.toUpperCase(), size / 2, size * 0.82)
    ctx.globalAlpha = 1
  }

  const dataUrl = canvas.toDataURL('image/png')
  imageCache.set(key, dataUrl)
  return dataUrl
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/* ── Main wrapper ── */
interface InfiniteViewProps {
  notes: Note[]
  onSelectNote: (note: Note) => void
}

export default function InfiniteView({ notes, onSelectNote }: InfiniteViewProps) {
  const [webglSupported] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!c.getContext('webgl2')
    } catch { return false }
  })

  const items = useMemo<MenuItem[]>(() =>
    notes.map(note => ({
      image: generateNoteDiscImage(note),
      link: note.id,
      title: note.title || 'Untitled',
      description: stripHtml(note.content).slice(0, 80) || 'Empty note',
    })),
    [notes]
  )

  const handleItemClick = useCallback((item: MenuItem) => {
    const note = notes.find(n => n.id === item.link)
    if (note) onSelectNote(note)
  }, [notes, onSelectNote])

  if (!webglSupported) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-gray-400">
        <p>WebGL2 is not supported on this device. Use Grid or Tab view instead.</p>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white mb-1">No notes yet</p>
          <p className="text-sm text-gray-400">Create a note to see it on the sphere.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      <InfiniteMenu items={items} onItemClick={handleItemClick} scale={1} />
    </div>
  )
}
