import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { ResizableImage } from './extensions/ResizableImage'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { common, createLowlight } from 'lowlight'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import 'highlight.js/styles/github.css'
import './tiptap-styles.css'
import { FontSize } from './extensions/FontSize'
import { AudioNode } from './extensions/AudioNode'
import EditorToolbar from './EditorToolbar'
import type { Note, NoteType } from '../../types'

const lowlight = createLowlight(common)
lowlight.register('java', java)
lowlight.register('javascript', javascript)
lowlight.register('python', python)
lowlight.register('sql', sql)

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
]

interface Props {
  note: Note | null
  isNew: boolean
  onSave: (title: string, content: string, noteType: NoteType) => Promise<void>
  onUpdate: (id: string, updates: { title?: string; content?: string; note_type?: NoteType }) => Promise<{ error: unknown } | undefined>
  onDelete: (id: string) => Promise<{ error: unknown } | undefined>
  noTitleIndex: number
  tabTitle?: string
  onTitleChange?: (title: string) => void
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CODE_NOTE_TYPES: NoteType[] = ['java', 'javascript', 'python', 'sql']

function stripHtmlToText(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function getInitialContent(note: Note | null, isNew: boolean): string {
  if (isNew || !note) return ''
  const c = note.content
  if (!c) return ''

  const isCodeType = CODE_NOTE_TYPES.includes(note.note_type)
  const isHtml = c.startsWith('<') && (c.includes('</') || c.includes('/>'))

  // Code note: ensure content is in a code block
  if (isCodeType) {
    // Already a code block — return as-is
    if (isHtml && c.includes('<pre>')) return c
    // HTML saved as paragraphs — extract text and wrap in code block
    const text = isHtml ? stripHtmlToText(c) : c
    return `<pre><code class="language-${note.note_type}">${escapeHtml(text)}</code></pre>`
  }

  if (isHtml) return c
  return c.split('\n').map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`).join('')
}

export default function NoteEditor({ note, isNew, onSave, onUpdate, onDelete: _onDelete, noTitleIndex, tabTitle, onTitleChange }: Props) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [noteType, setNoteType] = useState<NoteType>(note?.note_type ?? 'basic')
  const [saving, setSaving] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)
  const lastSavedContentRef = useRef<string | null>(null)
  const latestRef = useRef({ title, content: '', noteType, note, isNew, noTitleIndex })

  const handleAutoSave = useCallback((t: string, c: string, nt: NoteType) => {
    if (!note || isNew) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const updates: { title?: string; content?: string; note_type?: NoteType } = {}
      if (t !== note.title) updates.title = t || `No title ${noTitleIndex}`
      if (c !== note.content) updates.content = c
      if (nt !== note.note_type) updates.note_type = nt
      if (Object.keys(updates).length > 0) {
        lastSavedContentRef.current = c
        setSaving(true)
        await onUpdate(note.id, updates)
        setSaving(false)
      }
    }, 800)
  }, [note, isNew, onUpdate, noTitleIndex])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      }),
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      FontSize,
      AudioNode,
    ],
    content: getInitialContent(note, isNew),
    editable: true,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const text = ed.getText()
      latestRef.current.content = html
      setHasContent(!!text.trim())
      if (!latestRef.current.isNew && latestRef.current.note) {
        handleAutoSave(latestRef.current.title, html, latestRef.current.noteType)
      }
    },
  })

  // Keep latestRef in sync
  latestRef.current.title = title
  latestRef.current.noteType = noteType
  latestRef.current.note = note
  latestRef.current.isNew = isNew
  latestRef.current.noTitleIndex = noTitleIndex
  if (editor) {
    latestRef.current.content = editor.getHTML()
  }

  // Sync external note changes (from other tabs/sessions only)
  useEffect(() => {
    if (note && !isNew && editor) {
      setTitle(note.title)
      setNoteType(note.note_type)
      // Skip if this is our own save echoing back via realtime
      if (lastSavedContentRef.current !== null && note.content === lastSavedContentRef.current) {
        lastSavedContentRef.current = null
        return
      }
      const currentHtml = editor.getHTML()
      const noteContent = getInitialContent(note, false)
      if (noteContent !== currentHtml && note.content !== currentHtml) {
        editor.commands.setContent(noteContent, { emitUpdate: false })
      }
    }
  }, [note?.title, note?.content, note?.note_type, editor, isNew])

  // Handle new note reset
  useEffect(() => {
    if (isNew && editor) {
      setTitle('')
      setNoteType('basic')
      editor.commands.setContent('', { emitUpdate: false })
      editor.commands.focus()
    }
  }, [isNew, editor])

  // Sync title when tab is renamed
  useEffect(() => {
    if (tabTitle && tabTitle !== 'New Note' && tabTitle !== title) {
      setTitle(tabTitle)
    }
  }, [tabTitle])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      const { title: t, content: c, noteType: nt, note: n, isNew: isN, noTitleIndex: idx } = latestRef.current
      if (n && !isN) {
        const updates: { title?: string; content?: string; note_type?: NoteType } = {}
        if (t !== n.title) updates.title = t || `No title ${idx}`
        if (c !== n.content) updates.content = c
        if (nt !== n.note_type) updates.note_type = nt
        if (Object.keys(updates).length > 0) {
          onUpdate(n.id, updates)
        }
      } else if (isN && !savedRef.current) {
        if ((c && c !== '<p></p>') || t.trim()) {
          onSave(t.trim() || `No title ${idx}`, c || '', nt)
        }
      }
    }
  }, [])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    onTitleChange?.(val)
    if (!isNew && note && editor) handleAutoSave(val, editor.getHTML(), noteType)
  }

  const handleTypeChange = (val: NoteType) => {
    setNoteType(val)
    if (editor) {
      // Auto-insert a task list when switching to checkbox type on empty editor
      if (val === 'checkbox' && !editor.getText().trim()) {
        editor.chain().focus().toggleTaskList().run()
      }
      // Auto-insert a code block when switching to a code type
      if (CODE_NOTE_TYPES.includes(val)) {
        const text = editor.getText()
        editor.commands.setContent(
          `<pre><code class="language-${val}">${escapeHtml(text)}</code></pre>`,
          { emitUpdate: false }
        )
        editor.commands.focus('end')
      }
    }
    if (!isNew && note && editor) handleAutoSave(title, editor.getHTML(), val)
  }

  const handleManualSave = async () => {
    if (!editor) return
    const html = editor.getHTML()
    if (isNew) {
      const plainText = editor.getText()
      if (!plainText.trim() && !title.trim()) return
      savedRef.current = true
      setSaving(true)
      const finalTitle = title.trim() || `No title ${noTitleIndex}`
      await onSave(finalTitle, html, noteType)
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200/50 dark:border-white/5 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Add title"
          className="flex-1 text-lg font-semibold bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
        />

        <select
          value={noteType}
          onChange={(e) => handleTypeChange(e.target.value as NoteType)}
          className="px-2.5 py-1 text-xs font-medium rounded-xl bg-gray-100/80 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
          {isNew && (
            <button
              onClick={handleManualSave}
              disabled={saving || (!hasContent && !title.trim())}
              className="px-4 py-1.5 text-sm bg-black dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
            >
              Save
            </button>
          )}
          {!isNew && note && (
            <button
              onClick={() => {
                if (!editor || !note) return
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                const html = editor.getHTML()
                const updates: { title?: string; content?: string; note_type?: NoteType } = {}
                if (title !== note.title) updates.title = title || `No title ${noTitleIndex}`
                if (html !== note.content) updates.content = html
                if (noteType !== note.note_type) updates.note_type = noteType
                if (Object.keys(updates).length > 0) {
                  lastSavedContentRef.current = html
                  setSaving(true)
                  onUpdate(note.id, updates).then(() => setSaving(false))
                }
              }}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Toolbar — always visible */}
      {editor && (
        <EditorToolbar editor={editor} title={title || `No title ${noTitleIndex}`} noteType={noteType} />
      )}

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto p-6 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />

        {note && (
          <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Updated {new Date(note.updated_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
