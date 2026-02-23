import { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import 'highlight.js/styles/github.css'
import type { Note, NoteType } from '../../types'

hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('sql', sql)

interface Props {
  note: Note
  onUpdate: (id: string, updates: { title?: string; content?: string; note_type?: NoteType }) => Promise<{ error: unknown } | undefined>
  onDelete: (id: string) => Promise<{ error: unknown } | undefined>
}

export default function NoteEditor({ note, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setIsEditing(false)
  }, [note.id])

  useEffect(() => {
    if (!isEditing && note.note_type !== 'basic' && codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted')
      hljs.highlightElement(codeRef.current)
    }
  }, [isEditing, note.note_type, content])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(note.id, { title, content })
    setSaving(false)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Delete this note?')) {
      await onDelete(note.id)
    }
  }

  const handleCancel = () => {
    setTitle(note.title)
    setContent(note.content)
    setIsEditing(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none"
            />
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{note.title}</h2>
          )}
          {note.note_type !== 'basic' && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {note.note_type}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full min-h-[400px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Write your content..."
          />
        ) : note.note_type === 'basic' ? (
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{note.content}</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <pre className="!m-0 !bg-gray-50 dark:!bg-gray-800/50"><code
              ref={codeRef}
              className={`language-${note.note_type} !bg-transparent`}
            >{content}</code></pre>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Updated {new Date(note.updated_at).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
