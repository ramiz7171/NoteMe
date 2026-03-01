import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useEncryption } from '../../../src/context/EncryptionContext'
import { useAuth } from '../../../src/context/AuthContext'
import { useNotes } from '../../../src/hooks/useNotes'
import { useFolders } from '../../../src/hooks/useFolders'
import { useEditorBridge, RichText, Toolbar, TenTapStartKit, useEditorContent } from '@10play/tentap-editor'
import { summarizeText, fixGrammar, fixCode, getDailyUsage, addDailyUsage, generateEmail, generateMessage, AI_LIMITS } from '../../../src/lib/gemini'
import { NOTE_COLORS } from '@shared/lib/constants'
import type { NoteType } from '@shared/types'
import * as Haptics from 'expo-haptics'
import * as Clipboard from 'expo-clipboard'

const CODE_TYPES: NoteType[] = ['java', 'javascript', 'python', 'sql']
const TONES = ['professional', 'casual', 'short', 'friendly', 'formal'] as const
type Tone = (typeof TONES)[number]

export default function NoteEditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>()
  const { colors, isDark } = useTheme()
  const { user, profile } = useAuth()
  const { encryptString, decryptString, isEncryptionEnabled, isUnlocked } = useEncryption()
  const encrypt = isEncryptionEnabled && isUnlocked ? encryptString : undefined
  const decrypt = isEncryptionEnabled && isUnlocked ? decryptString : undefined
  const { notes, updateNote, updateNoteColor, deleteNote, pinNote, archiveNote, moveToFolder } = useNotes({ encrypt, decrypt })
  const { folders } = useFolders()
  const router = useRouter()

  const note = notes.find(n => n.id === noteId)
  const isCodeNote = note ? CODE_TYPES.includes(note.note_type) : false
  const [title, setTitle] = useState(note?.title || '')
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [showAIWriter, setShowAIWriter] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const titleSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TenTap rich text editor
  const editor = useEditorBridge({
    bridgeExtensions: TenTapStartKit,
    initialContent: note?.content || '',
    autofocus: false,
    avoidIosKeyboard: true,
    theme: {
      webview: { backgroundColor: colors.background },
      toolbar: {
        toolbarBody: {
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          backgroundColor: colors.headerBg,
        },
      },
    },
  })

  // Inject CSS for theme
  useEffect(() => {
    editor.injectCSS(`
      body, .ProseMirror { background: ${colors.background}; color: ${colors.text}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; line-height: 1.6; padding: 12px 16px; min-height: 300px; }
      .ProseMirror:focus { outline: none; }
      .ProseMirror p.is-editor-empty:first-child::before { color: ${colors.textSecondary}; }
      .ProseMirror pre { background: ${isDark ? '#1e1e1e' : '#f5f5f5'}; padding: 12px; border-radius: 8px; overflow-x: auto; }
      .ProseMirror code { background: ${isDark ? '#2d2d2d' : '#f0f0f0'}; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
      .ProseMirror pre code { background: none; padding: 0; }
      .ProseMirror blockquote { border-left: 3px solid ${colors.accent}; padding-left: 12px; margin-left: 0; color: ${colors.textSecondary}; }
      .ProseMirror h1 { font-size: 26px; font-weight: 800; margin: 16px 0 8px; }
      .ProseMirror h2 { font-size: 22px; font-weight: 700; margin: 14px 0 6px; }
      .ProseMirror h3 { font-size: 18px; font-weight: 700; margin: 12px 0 4px; }
      .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
      .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p { text-decoration: line-through; color: ${colors.textSecondary}; }
      .ProseMirror a { color: ${colors.accent}; text-decoration: underline; }
      .ProseMirror hr { border: none; border-top: 1px solid ${colors.border}; margin: 16px 0; }
    `, 'app-theme')
  }, [colors, isDark])

  // Auto-save content (2s debounce via useEditorContent)
  const editorContent = useEditorContent(editor, { type: 'html', debounceInterval: 2000 })
  const skipFirstRef = useRef(true)
  const lastSavedRef = useRef(note?.content || '')

  useEffect(() => {
    if (!editorContent || !noteId) return
    const html = editorContent as string
    if (skipFirstRef.current) { skipFirstRef.current = false; lastSavedRef.current = html; return }
    if (html === lastSavedRef.current) return
    lastSavedRef.current = html
    setSaving(true)
    updateNote(noteId, { content: html }).then(() => setSaving(false))
  }, [editorContent])

  // Sync title on note load
  useEffect(() => { if (note) setTitle(note.title) }, [note?.id])

  // Title auto-save with debounce
  const handleTitleChange = (text: string) => {
    setTitle(text)
    if (!noteId) return
    if (titleSaveRef.current) clearTimeout(titleSaveRef.current)
    titleSaveRef.current = setTimeout(async () => {
      setSaving(true)
      await updateNote(noteId, { title: text })
      setSaving(false)
    }, 800)
  }

  // --- AI Handlers ---
  const isAdmin = profile?.is_admin === true

  const handleSummarize = async () => {
    if (!user || !noteId) return
    if (!isAdmin) {
      const usage = await getDailyUsage('summarize', user.id, AI_LIMITS.summarize.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily summarize limit reached.'); return }
    }
    setAiLoading('summarize')
    try {
      const text = await editor.getText()
      if (!text?.trim()) { setAiLoading(null); Alert.alert('Empty', 'No content to summarize.'); return }
      const result = await summarizeText(text)
      if (!isAdmin) await addDailyUsage('summarize', user.id, 1)
      Alert.alert('Summary', result, [
        { text: 'Copy', onPress: () => Clipboard.setStringAsync(result) },
        { text: 'Replace', onPress: () => editor.setContent(`<p>${result.replace(/\n/g, '</p><p>')}</p>`) },
        { text: 'OK' },
      ])
    } catch { Alert.alert('Error', 'Summarization failed.') }
    finally { setAiLoading(null) }
  }

  const handleFixGrammar = async () => {
    if (!user || !noteId) return
    if (!isAdmin) {
      const usage = await getDailyUsage('grammar', user.id, AI_LIMITS.grammar.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily grammar fix limit reached.'); return }
    }
    setAiLoading('grammar')
    try {
      const text = await editor.getText()
      if (!text?.trim()) { setAiLoading(null); Alert.alert('Empty', 'No content to fix.'); return }
      const fixed = await fixGrammar(text)
      if (!isAdmin) await addDailyUsage('grammar', user.id, 1)
      editor.setContent(`<p>${fixed.replace(/\n/g, '</p><p>')}</p>`)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { Alert.alert('Error', 'Grammar fix failed.') }
    finally { setAiLoading(null) }
  }

  const handleFixCode = async () => {
    if (!user || !noteId || !isCodeNote || !note) return
    if (!isAdmin) {
      const usage = await getDailyUsage('codefix', user.id, AI_LIMITS.codefix.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily code fix limit reached.'); return }
    }
    setAiLoading('codefix')
    try {
      const text = await editor.getText()
      if (!text?.trim()) { setAiLoading(null); Alert.alert('Empty', 'No code to fix.'); return }
      const fixed = await fixCode(text, note.note_type)
      const lines = text.split('\n').length
      if (!isAdmin) await addDailyUsage('codefix', user.id, lines)
      const escaped = fixed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      editor.setContent(`<pre><code class="language-${note.note_type}">${escaped}</code></pre>`)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { Alert.alert('Error', 'Code fix failed.') }
    finally { setAiLoading(null) }
  }

  const handleAIInsert = async (text: string) => {
    const html = await editor.getHTML()
    const insertHtml = `<p>${text.replace(/\n/g, '</p><p>')}</p>`
    editor.setContent((html || '') + insertHtml)
    setShowAIWriter(false)
  }

  // --- Note Action Handlers ---
  const handleDelete = () => {
    Alert.alert('Delete Note', 'Move this note to trash?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteNote(noteId!)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        router.back()
      }},
    ])
  }

  const handlePin = async () => {
    if (!noteId) return
    await pinNote(noteId)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleArchive = async () => {
    if (!noteId) return
    await archiveNote(noteId)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  const handleColorSelect = async (color: string) => {
    if (!noteId) return
    await updateNoteColor(noteId, color)
    setShowColorPicker(false)
    Haptics.selectionAsync()
  }

  const handleFolderSelect = async (folderId: string | null) => {
    if (!noteId) return
    await moveToFolder(noteId, folderId)
    setShowFolderPicker(false)
    Haptics.selectionAsync()
  }

  if (!note) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 16 }}>Notes</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {(saving || aiLoading) && <ActivityIndicator size="small" color={aiLoading ? colors.accent : colors.textSecondary} />}
            <TouchableOpacity onPress={handlePin}>
              <Ionicons name={note.pinned ? 'pin' : 'pin-outline'} size={20} color={note.pinned ? colors.accent : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMore(true)}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8, padding: 0 }}
          value={title} onChangeText={handleTitleChange} placeholder="Note title" placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* AI + Actions Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, maxHeight: 44, minHeight: 44 }}
        contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
        <ActionBtn icon="sparkles" label="Summarize" onPress={handleSummarize} loading={aiLoading === 'summarize'} colors={colors} />
        <ActionBtn icon="text" label="Grammar" onPress={handleFixGrammar} loading={aiLoading === 'grammar'} colors={colors} />
        {isCodeNote && <ActionBtn icon="code-slash" label="Fix Code" onPress={handleFixCode} loading={aiLoading === 'codefix'} colors={colors} />}
        <ActionBtn icon="create" label="AI Writer" onPress={() => setShowAIWriter(true)} colors={colors} />
        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 6 }} />
        <ActionBtn icon="color-palette-outline" onPress={() => setShowColorPicker(true)} colors={colors} active={!!note.color} />
        <ActionBtn icon="folder-outline" onPress={() => setShowFolderPicker(true)} colors={colors} active={!!note.folder_id} />
        <ActionBtn icon="archive-outline" onPress={handleArchive} colors={colors} />
      </ScrollView>

      {/* Rich Text Editor */}
      <RichText editor={editor} />

      {/* Formatting Toolbar (auto-shows with keyboard) */}
      <Toolbar editor={editor} />

      {/* More Menu */}
      <Modal visible={showMore} transparent animationType="fade" onRequestClose={() => setShowMore(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowMore(false)}>
          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <MoreItem icon={note.pinned ? 'pin' : 'pin-outline'} label={note.pinned ? 'Unpin' : 'Pin'} onPress={() => { handlePin(); setShowMore(false) }} colors={colors} />
            <MoreItem icon="archive-outline" label="Archive" onPress={() => { handleArchive(); setShowMore(false) }} colors={colors} />
            <MoreItem icon="color-palette-outline" label="Color" onPress={() => { setShowMore(false); setTimeout(() => setShowColorPicker(true), 300) }} colors={colors} />
            <MoreItem icon="folder-outline" label="Move to Folder" onPress={() => { setShowMore(false); setTimeout(() => setShowFolderPicker(true), 300) }} colors={colors} />
            <MoreItem icon="trash-outline" label="Delete" onPress={() => { setShowMore(false); setTimeout(handleDelete, 300) }} colors={colors} danger />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Color Picker */}
      <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => setShowColorPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowColorPicker(false)}>
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 20, padding: 24, width: 300 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Note Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity key={c || 'none'} onPress={() => handleColorSelect(c)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c || colors.surfaceSecondary,
                    borderWidth: note.color === c ? 3 : 1, borderColor: note.color === c ? colors.accent : colors.border,
                    justifyContent: 'center', alignItems: 'center' }}>
                  {!c && <Ionicons name="close" size={16} color={colors.textSecondary} />}
                  {note.color === c && !!c && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder Picker */}
      <Modal visible={showFolderPicker} transparent animationType="fade" onRequestClose={() => setShowFolderPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowFolderPicker(false)}>
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 20, padding: 20, width: 300, maxHeight: 400 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Move to Folder</Text>
            <ScrollView>
              <TouchableOpacity onPress={() => handleFolderSelect(null)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, backgroundColor: !note.folder_id ? colors.accent + '20' : 'transparent', marginBottom: 4 }}>
                <Ionicons name="document-outline" size={18} color={!note.folder_id ? colors.accent : colors.textSecondary} />
                <Text style={{ color: !note.folder_id ? colors.accent : colors.text, fontWeight: !note.folder_id ? '700' : '400', fontSize: 15 }}>No Folder</Text>
              </TouchableOpacity>
              {folders.map(f => (
                <TouchableOpacity key={f.id} onPress={() => handleFolderSelect(f.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, backgroundColor: note.folder_id === f.id ? colors.accent + '20' : 'transparent', marginBottom: 4 }}>
                  <Ionicons name="folder" size={18} color={note.folder_id === f.id ? colors.accent : colors.textSecondary} />
                  <Text style={{ color: note.folder_id === f.id ? colors.accent : colors.text, fontWeight: note.folder_id === f.id ? '700' : '400', fontSize: 15 }}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Writer */}
      <AIWriterModal visible={showAIWriter} onClose={() => setShowAIWriter(false)} onInsert={handleAIInsert} colors={colors} userId={user?.id || ''} />
    </View>
  )
}

function ActionBtn({ icon, label, onPress, loading, colors, active }: {
  icon: string; label?: string; onPress: () => void; loading?: boolean; colors: any; active?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: active ? colors.accent + '20' : 'transparent' }}>
      {loading ? <ActivityIndicator size={14} color={colors.accent} /> : <Ionicons name={icon as any} size={16} color={active ? colors.accent : colors.textSecondary} />}
      {label && <Text style={{ fontSize: 12, color: active ? colors.accent : colors.textSecondary, fontWeight: '500' }}>{label}</Text>}
    </TouchableOpacity>
  )
}

function MoreItem({ icon, label, onPress, colors, danger }: {
  icon: string; label: string; onPress: () => void; colors: any; danger?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <Ionicons name={icon as any} size={20} color={danger ? colors.error : colors.text} />
      <Text style={{ fontSize: 16, color: danger ? colors.error : colors.text }}>{label}</Text>
    </TouchableOpacity>
  )
}

function AIWriterModal({ visible, onClose, onInsert, colors, userId }: {
  visible: boolean; onClose: () => void; onInsert: (text: string) => void; colors: any; userId: string
}) {
  const [tab, setTab] = useState<'email' | 'message'>('email')
  const [subject, setSubject] = useState('')
  const [context, setContext] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [result, setResult] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const canGenerate = tab === 'email' ? !!(subject.trim() && context.trim()) : !!context.trim()

  const handleGenerate = async () => {
    if (!userId || !canGenerate) return
    setGenerating(true); setError(''); setResult('')
    try {
      const output = tab === 'email' ? await generateEmail(subject, context, tone) : await generateMessage(context, tone)
      setResult(output)
      await addDailyUsage('ai_writer', userId, 1)
    } catch (err: any) {
      setError(err?.message?.includes('429') ? 'Rate limit reached. Try again later.' : 'Generation failed. Please try again.')
    }
    setGenerating(false)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 40 }}>
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>AI Writer</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {(['email', 'message'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => { setTab(t); setResult(''); setError('') }}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === t ? colors.accent : 'transparent', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t ? '#fff' : colors.textSecondary, textTransform: 'capitalize' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'email' && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Subject</Text>
                <TextInput value={subject} onChangeText={setSubject} placeholder="Email subject..."
                  style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
                  placeholderTextColor={colors.textSecondary} />
              </>
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
              {tab === 'email' ? 'Context / Details' : 'What should the message say?'}
            </Text>
            <TextInput value={context} onChangeText={setContext} multiline numberOfLines={3}
              placeholder={tab === 'email' ? 'Key points, recipients, purpose...' : 'Describe the message...'}
              style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12, minHeight: 80, textAlignVertical: 'top' }}
              placeholderTextColor={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Tone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {TONES.map(t => (
                <TouchableOpacity key={t} onPress={() => setTone(t)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: tone === t ? colors.accent : colors.surfaceSecondary }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tone === t ? '#fff' : colors.text, textTransform: 'capitalize' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleGenerate} disabled={generating || !canGenerate}
              style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center', opacity: generating || !canGenerate ? 0.5 : 1, marginBottom: 12 }}>
              {generating ? <ActivityIndicator color="#fff" /> :
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Generate {tab === 'email' ? 'Email' : 'Message'}</Text>}
            </TouchableOpacity>
            {error ? <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 12, fontSize: 13 }}>{error}</Text> : null}
            {result ? (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{result}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(result)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.inputBg }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onInsert(result)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.accent }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Insert</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
