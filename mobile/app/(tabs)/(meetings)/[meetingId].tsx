import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useAuth } from '../../../src/context/AuthContext'
import { useMeetings } from '../../../src/hooks/useMeetings'
import { generateMeetingNotes, extractActionItems, generateFollowUp, getDailyUsage, addDailyUsage, AI_LIMITS } from '../../../src/lib/gemini'
import type { AgendaItem, MeetingStatus } from '@shared/types'
import { MEETING_STATUS_OPTIONS } from '@shared/lib/constants'
import * as Haptics from 'expo-haptics'
import * as Clipboard from 'expo-clipboard'

const STATUS_COLORS: Record<string, string> = { scheduled: '#3b82f6', in_progress: '#eab308', completed: '#22c55e', cancelled: '#6b7280' }
const STATUS_LABELS: Record<string, string> = { scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }

export default function MeetingDetail() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>()
  const { colors } = useTheme()
  const { user, profile } = useAuth()
  const { meetings, updateMeeting, deleteMeeting } = useMeetings()
  const router = useRouter()
  const meeting = meetings.find(m => m.id === meetingId)
  const isAdmin = profile?.is_admin === true

  // Editable fields
  const [title, setTitle] = useState(meeting?.title || '')
  const [date, setDate] = useState(meeting?.meeting_date || '')
  const [duration, setDuration] = useState(String(meeting?.duration_minutes || 30))
  const [status, setStatus] = useState<MeetingStatus>(meeting?.status || 'scheduled')
  const [participants, setParticipants] = useState<string[]>(meeting?.participants || [])
  const [newParticipant, setNewParticipant] = useState('')
  const [agenda, setAgenda] = useState<AgendaItem[]>(meeting?.agenda || [])
  const [newAgendaText, setNewAgendaText] = useState('')
  // AI
  const [generatingNotes, setGeneratingNotes] = useState(false)
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false)
  // Status picker
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  // Edit mode
  const [editingField, setEditingField] = useState<string | null>(null)

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title)
      setDate(meeting.meeting_date)
      setDuration(String(meeting.duration_minutes))
      setStatus(meeting.status)
      setParticipants(meeting.participants || [])
      setAgenda(meeting.agenda || [])
    }
  }, [meeting?.id, meeting?.updated_at])

  const save = (updates: Record<string, any>) => {
    if (meetingId) updateMeeting(meetingId, updates)
  }

  // Agenda CRUD
  const addAgendaItem = () => {
    if (!newAgendaText.trim()) return
    const updated = [...agenda, { text: newAgendaText.trim(), completed: false }]
    setAgenda(updated)
    setNewAgendaText('')
    save({ agenda: updated })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const toggleAgenda = (index: number) => {
    const updated = agenda.map((a, i) => i === index ? { ...a, completed: !a.completed } : a)
    setAgenda(updated)
    save({ agenda: updated })
    Haptics.selectionAsync()
  }

  const deleteAgendaItem = (index: number) => {
    const updated = agenda.filter((_, i) => i !== index)
    setAgenda(updated)
    save({ agenda: updated })
  }

  // Participants
  const addParticipant = () => {
    if (!newParticipant.trim()) return
    const updated = [...participants, newParticipant.trim()]
    setParticipants(updated)
    setNewParticipant('')
    save({ participants: updated })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const removeParticipant = (index: number) => {
    const updated = participants.filter((_, i) => i !== index)
    setParticipants(updated)
    save({ participants: updated })
  }

  // AI handlers
  const handleGenerateNotes = async () => {
    if (!user || !meetingId) return
    if (!isAdmin) {
      const usage = await getDailyUsage('meeting_notes', user.id, AI_LIMITS.meeting_notes.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily meeting notes limit reached.'); return }
    }
    setGeneratingNotes(true)
    try {
      // Use AI notes from existing content or agenda as context
      const context = meeting?.ai_notes || agenda.map(a => `${a.completed ? '[x]' : '[ ]'} ${a.text}`).join('\n') || meeting?.title || ''
      const notes = await generateMeetingNotes(context, agenda.map(a => a.text))
      await updateMeeting(meetingId, { ai_notes: notes })
      if (!isAdmin) await addDailyUsage('meeting_notes', user.id, 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { Alert.alert('Error', 'Failed to generate notes.') }
    setGeneratingNotes(false)
  }

  const handleGenerateFollowUp = async () => {
    if (!user || !meetingId || !meeting) return
    if (!isAdmin) {
      const usage = await getDailyUsage('meeting_notes', user.id, AI_LIMITS.meeting_notes.daily)
      if (usage.remaining <= 0) { Alert.alert('Limit Reached', 'Daily limit reached.'); return }
    }
    setGeneratingFollowUp(true)
    try {
      const notes = meeting.ai_notes || agenda.map(a => a.text).join('\n') || ''
      const followUp = await generateFollowUp(meeting.title, participants, notes)
      await updateMeeting(meetingId, { follow_up: followUp })
      if (!isAdmin) await addDailyUsage('meeting_notes', user.id, 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { Alert.alert('Error', 'Failed to generate follow-up.') }
    setGeneratingFollowUp(false)
  }

  const handleDelete = () => {
    Alert.alert('Delete Meeting', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteMeeting(meetingId!)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        router.back()
      }},
    ])
  }

  if (!meeting) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.accent} /></View>
  }

  const completedCount = agenda.filter(a => a.completed).length

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}><Ionicons name="trash-outline" size={22} color={colors.error} /></TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Title (editable) */}
        <TextInput value={title} onChangeText={setTitle} onBlur={() => save({ title })}
          style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16, padding: 0 }} placeholder="Meeting title" placeholderTextColor={colors.textSecondary} />

        {/* Status */}
        <TouchableOpacity onPress={() => setShowStatusPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: STATUS_COLORS[status] + '20' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Date & Duration */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Date</Text>
            <TextInput value={date ? new Date(date).toLocaleString() : ''} editable={false}
              style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
          </View>
          <View style={{ width: 100 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Duration</Text>
            <TextInput value={duration} onChangeText={setDuration} onBlur={() => save({ duration_minutes: parseInt(duration) || 30 })}
              keyboardType="number-pad"
              style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 }}>minutes</Text>
          </View>
        </View>

        {/* Participants */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Participants</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {participants.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: colors.accentLight }}>
                <Text style={{ fontSize: 13, color: colors.accent }}>{p}</Text>
                <TouchableOpacity onPress={() => removeParticipant(i)}><Ionicons name="close-circle" size={16} color={colors.accent} /></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={newParticipant} onChangeText={setNewParticipant} placeholder="Add participant..."
              onSubmitEditing={addParticipant} returnKeyType="done"
              style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }}
              placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity onPress={addParticipant} style={{ backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Agenda */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Agenda</Text>
            {agenda.length > 0 && <Text style={{ fontSize: 12, color: colors.accent }}>{completedCount}/{agenda.length} done</Text>}
          </View>
          {agenda.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, backgroundColor: colors.surface, borderRadius: 10, padding: 10 }}>
              <TouchableOpacity onPress={() => toggleAgenda(i)}>
                <Ionicons name={a.completed ? 'checkbox' : 'square-outline'} size={20} color={a.completed ? colors.success : colors.textSecondary} />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 14, color: a.completed ? colors.textSecondary : colors.text, textDecorationLine: a.completed ? 'line-through' : 'none' }}>{a.text}</Text>
              <TouchableOpacity onPress={() => deleteAgendaItem(i)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TextInput value={newAgendaText} onChangeText={setNewAgendaText} placeholder="Add agenda item..."
              onSubmitEditing={addAgendaItem} returnKeyType="done"
              style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }}
              placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity onPress={addAgendaItem} style={{ backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Notes */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>AI Notes</Text>
            <TouchableOpacity onPress={handleGenerateNotes} disabled={generatingNotes}>
              {generatingNotes ? <ActivityIndicator size="small" color={colors.accent} /> :
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{meeting.ai_notes ? 'Regenerate' : 'Generate'}</Text>}
            </TouchableOpacity>
          </View>
          {meeting.ai_notes ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{meeting.ai_notes}</Text>
              <TouchableOpacity onPress={() => Clipboard.setStringAsync(meeting.ai_notes)} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Copy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Ionicons name="sparkles" size={24} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Add agenda items then generate AI notes</Text>
            </View>
          )}
        </View>

        {/* Follow-up */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Follow-up Email</Text>
            <TouchableOpacity onPress={handleGenerateFollowUp} disabled={generatingFollowUp}>
              {generatingFollowUp ? <ActivityIndicator size="small" color={colors.accent} /> :
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{meeting.follow_up ? 'Regenerate' : 'Generate'}</Text>}
            </TouchableOpacity>
          </View>
          {meeting.follow_up ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{meeting.follow_up}</Text>
              <TouchableOpacity onPress={() => Clipboard.setStringAsync(meeting.follow_up)} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Copy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Ionicons name="mail-outline" size={24} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Generate a follow-up email for this meeting</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Status Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 20, padding: 20, width: 280 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Meeting Status</Text>
            {MEETING_STATUS_OPTIONS.map(s => (
              <TouchableOpacity key={s} onPress={() => { setStatus(s); save({ status: s }); setShowStatusPicker(false); Haptics.selectionAsync() }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: status === s ? STATUS_COLORS[s] + '20' : 'transparent', marginBottom: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS_COLORS[s] }} />
                <Text style={{ fontSize: 15, color: status === s ? STATUS_COLORS[s] : colors.text, fontWeight: status === s ? '700' : '400' }}>{STATUS_LABELS[s]}</Text>
                {status === s && <Ionicons name="checkmark" size={18} color={STATUS_COLORS[s]} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
