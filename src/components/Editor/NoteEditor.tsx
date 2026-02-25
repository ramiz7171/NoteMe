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
import CustomSelect from '../shared/CustomSelect'
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
  const [autoSave, setAutoSave] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)
  const lastSavedContentRef = useRef<string | null>(null)
  const lastSavedTitleRef = useRef<string | null>(null)
  const lastSavedTypeRef = useRef<NoteType | null>(null)
  const latestRef = useRef({ title, content: '', noteType, note, isNew, noTitleIndex })

  const autoSaveRef = useRef(autoSave)
  autoSaveRef.current = autoSave

  const handleAutoSave = useCallback((t: string, c: string, nt: NoteType) => {
    if (!note || isNew) return
    if (!autoSaveRef.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const updates: { title?: string; content?: string; note_type?: NoteType } = {}
      if (t !== note.title) updates.title = t || `No title ${noTitleIndex}`
      if (c !== note.content) updates.content = c
      if (nt !== note.note_type) updates.note_type = nt
      if (Object.keys(updates).length > 0) {
        lastSavedContentRef.current = c
        lastSavedTitleRef.current = updates.title ?? null
        lastSavedTypeRef.current = updates.note_type ?? null
        setSaving(true)
        await onUpdate(note.id, updates)
        setSaving(false)
        setHasChanges(false)
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
        const n = latestRef.current.note
        setHasChanges(html !== n.content || latestRef.current.title !== n.title || latestRef.current.noteType !== n.note_type)
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
      // Only sync title if it came from an external source (not our own save)
      if (lastSavedTitleRef.current !== null && note.title === lastSavedTitleRef.current) {
        lastSavedTitleRef.current = null
      } else if (note.title !== latestRef.current.title) {
        setTitle(note.title)
      }

      // Only sync type if it came from an external source
      if (lastSavedTypeRef.current !== null && note.note_type === lastSavedTypeRef.current) {
        lastSavedTypeRef.current = null
      } else if (note.note_type !== latestRef.current.noteType) {
        setNoteType(note.note_type)
      }

      // Skip content sync if this is our own save echoing back
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
    if (!isNew && note && editor) {
      setHasChanges(val !== note.title || editor.getHTML() !== note.content || noteType !== note.note_type)
      handleAutoSave(val, editor.getHTML(), noteType)
    }
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
    if (!isNew && note && editor) {
      setHasChanges(title !== note.title || editor.getHTML() !== note.content || val !== note.note_type)
      handleAutoSave(title, editor.getHTML(), val)
    }
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

        <CustomSelect
          value={noteType}
          onChange={(val) => handleTypeChange(val as NoteType)}
          options={NOTE_TYPES}
        />

        <div className="flex items-center gap-2 shrink-0">
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
          {/* Auto-save toggle — for both new and existing notes */}
          {!isNew && (
            <button
              type="button"
              onClick={() => setAutoSave(prev => !prev)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors select-none hover:bg-gray-100 dark:hover:bg-white/5"
              title={autoSave ? 'Auto-save is on' : 'Auto-save is off'}
            >
              <div className={`relative w-7 h-4 rounded-full transition-colors duration-300 ${autoSave ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${autoSave ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
              <span className={`whitespace-nowrap transition-colors duration-300 ${autoSave ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {autoSave ? 'Auto save' : 'Manual'}
              </span>
            </button>
          )}
          {/* Save button — for new notes: always visible; for existing: animated in/out */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={
              isNew
                ? { maxWidth: 80, opacity: 1 }
                : { maxWidth: autoSave ? 0 : 80, opacity: autoSave ? 0 : 1 }
            }
          >
            <button
              onClick={() => {
                if (!editor) return
                if (isNew) {
                  handleManualSave()
                } else if (note) {
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                  const html = editor.getHTML()
                  const updates: { title?: string; content?: string; note_type?: NoteType } = {}
                  if (title !== note.title) updates.title = title || `No title ${noTitleIndex}`
                  if (html !== note.content) updates.content = html
                  if (noteType !== note.note_type) updates.note_type = noteType
                  if (Object.keys(updates).length > 0) {
                    lastSavedContentRef.current = html
                    lastSavedTitleRef.current = updates.title ?? null
                    lastSavedTypeRef.current = updates.note_type ?? null
                    setSaving(true)
                    onUpdate(note.id, updates).then(() => {
                      setSaving(false)
                      setHasChanges(false)
                    })
                  }
                }
              }}
              disabled={isNew ? (saving || (!hasContent && !title.trim())) : (saving || !hasChanges)}
              className={`px-3 py-1.5 text-sm rounded-xl whitespace-nowrap transition-colors ${
                isNew
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                  : hasChanges
                    ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
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
