import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useAuth } from '../../../src/context/AuthContext'
import { useTranscripts } from '../../../src/hooks/useTranscripts'
import { generateTranscriptSummary, extractActionItems, getDailyUsage, addDailyUsage, AI_LIMITS } from '../../../src/lib/gemini'
import * as Haptics from 'expo-haptics'
import * as Clipboard from 'expo-clipboard'

type Tab = 'transcript' | 'speakers' | 'summary' | 'actions'

export default function TranscriptViewer() {
  const { transcriptId } = useLocalSearchParams<{ transcriptId: string }>()
  const { colors } = useTheme()
  const { user, profile } = useAuth()
  const { transcripts, updateTranscript, deleteTranscript } = useTranscripts()
  const router = useRouter()
  const transcript = transcripts.find(t => t.id === transcriptId)
  const isAdmin = profile?.is_admin === true

  const [tab, setTab] = useState<Tab>('transcript')
  const [generating, setGenerating] = useState<string | null>(null)
  const [editingText, setEditingText] = useState(false)
  const [editText, setEditText] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState(transcript?.title || '')

  if (!transcript) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.accent} /></View>

  const handleSummarize = async () => {
    if (!transcript.transcript_text || !user) return
    if (!isAdmin) {
      const usage = await getDailyUsage('transcript', user.id, AI_LIMITS.transcript.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily transcript AI limit reached.'); return }
    }
    setGenerating('summary')
    try {
      const summary = await generateTranscriptSummary(transcript.transcript_text)
      await updateTranscript(transcriptId!, { summary })
      if (!isAdmin) await addDailyUsage('transcript', user.id, 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTab('summary')
    } catch { Alert.alert('Error', 'Failed to generate summary.') }
    setGenerating(null)
  }

  const handleExtractActions = async () => {
    if (!transcript.transcript_text || !user) return
    if (!isAdmin) {
      const usage = await getDailyUsage('action_items', user.id, AI_LIMITS.action_items.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily action items limit reached.'); return }
    }
    setGenerating('actions')
    try {
      const actions = await extractActionItems(transcript.transcript_text)
      await updateTranscript(transcriptId!, { action_items: actions })
      if (!isAdmin) await addDailyUsage('action_items', user.id, 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTab('actions')
    } catch { Alert.alert('Error', 'Failed to extract actions.') }
    setGenerating(null)
  }

  const handleEditText = () => {
    setEditText(transcript.transcript_text || '')
    setEditingText(true)
  }

  const handleSaveText = async () => {
    await updateTranscript(transcriptId!, { transcript_text: editText })
    setEditingText(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const handleSaveTitle = async () => {
    if (titleText.trim() && titleText !== transcript.title) {
      await updateTranscript(transcriptId!, { title: titleText.trim() })
    }
    setEditingTitle(false)
  }

  const handleDelete = () => {
    Alert.alert('Delete', 'Delete this transcript?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTranscript(transcriptId!); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.back() } },
    ])
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'transcript', label: 'Text', icon: 'document-text-outline' },
    { key: 'speakers', label: 'Speakers', icon: 'people-outline' },
    { key: 'summary', label: 'Summary', icon: 'sparkles-outline' },
    { key: 'actions', label: 'Actions', icon: 'checkbox-outline' },
  ]

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => Clipboard.setStringAsync(transcript.transcript_text || '')}>
              <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Title */}
        {editingTitle ? (
          <TextInput value={titleText} onChangeText={setTitleText} onBlur={handleSaveTitle} onSubmitEditing={handleSaveTitle}
            autoFocus style={{ fontSize: 20, fontWeight: '700', color: colors.text, padding: 0, marginBottom: 4 }} />
        ) : (
          <TouchableOpacity onPress={() => { setTitleText(transcript.title); setEditingTitle(true) }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{transcript.title}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{new Date(transcript.created_at).toLocaleDateString()}</Text>
          {transcript.duration_seconds > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{formatDuration(transcript.duration_seconds)}</Text>}
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: transcript.status === 'completed' ? colors.success + '20' : transcript.status === 'failed' ? colors.error + '20' : colors.warning + '20' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: transcript.status === 'completed' ? colors.success : transcript.status === 'failed' ? colors.error : colors.warning }}>{transcript.status}</Text>
          </View>
        </View>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(t => (
            <TouchableOpacity key={t.key} onPress={() => { setTab(t.key); Haptics.selectionAsync() }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, marginRight: 4, borderRadius: 20, backgroundColor: tab === t.key ? colors.accent : 'transparent' }}>
              <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t.key ? '#fff' : colors.textSecondary }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
        {tab === 'transcript' && (
          <View>
            {editingText ? (
              <>
                <TextInput value={editText} onChangeText={setEditText} multiline
                  style={{ fontSize: 14, color: colors.text, lineHeight: 22, minHeight: 300, textAlignVertical: 'top', backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setEditingText(false)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surfaceSecondary }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveText} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.accent }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleEditText} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{transcript.transcript_text || 'No transcript text.'}</Text>
              </>
            )}
          </View>
        )}

        {tab === 'speakers' && (
          <View>
            {transcript.speaker_segments?.length > 0 ? (
              transcript.speaker_segments.map((seg, i) => (
                <View key={i} style={{ marginBottom: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="person-circle" size={20} color={colors.accent} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{seg.speaker}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{seg.text}</Text>
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12 }}>No speaker segments</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'summary' && (
          <View>
            {transcript.summary ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{transcript.summary}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(transcript.summary)}>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSummarize} disabled={generating === 'summary'}>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>{generating === 'summary' ? 'Generating...' : 'Regenerate'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="sparkles-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, marginBottom: 16 }}>No summary yet</Text>
                <TouchableOpacity onPress={handleSummarize} disabled={generating === 'summary'}
                  style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, opacity: generating === 'summary' ? 0.6 : 1 }}>
                  {generating === 'summary' ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Generate Summary</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {tab === 'actions' && (
          <View>
            {transcript.action_items ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{transcript.action_items}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(transcript.action_items)}>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExtractActions} disabled={generating === 'actions'}>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>{generating === 'actions' ? 'Extracting...' : 'Regenerate'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="checkbox-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, marginBottom: 16 }}>No action items yet</Text>
                <TouchableOpacity onPress={handleExtractActions} disabled={generating === 'actions'}
                  style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, opacity: generating === 'actions' ? 0.6 : 1 }}>
                  {generating === 'actions' ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Extract Action Items</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
