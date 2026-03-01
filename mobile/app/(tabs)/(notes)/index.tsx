import { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl, Dimensions, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useEncryption } from '../../../src/context/EncryptionContext'
import { useNotes } from '../../../src/hooks/useNotes'
import { useFolders } from '../../../src/hooks/useFolders'
import { ScreenSkeleton } from '../../../src/components/ui/SkeletonLoader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { FAB } from '../../../src/components/ui/FAB'
import type { Note } from '@shared/types'
import * as Haptics from 'expo-haptics'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

type Filter = 'all' | 'pinned' | 'archived' | 'trash'

function NoteCard({ note, onPress, colors }: { note: Note; onPress: () => void; colors: any }) {
  const typeLabels: Record<string, string> = { basic: 'Note', checkbox: 'Checklist', java: 'Java', javascript: 'JS', python: 'Python', sql: 'SQL' }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{
      width: CARD_WIDTH, backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border, borderLeftWidth: note.color ? 4 : 1, borderLeftColor: note.color || colors.border,
    }}>
      {note.pinned && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, position: 'absolute', top: 12, right: 12 }} />}
      <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{note.title || 'Untitled'}</Text>
      <Text numberOfLines={3} style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
        {note.content?.replace(/<[^>]*>/g, '').slice(0, 120) || 'Empty note'}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{typeLabels[note.note_type] || note.note_type}</Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{new Date(note.updated_at).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function NotesScreen() {
  const { colors } = useTheme()
  const { encryptString, decryptString, isEncryptionEnabled, isUnlocked } = useEncryption()
  const encrypt = isEncryptionEnabled && isUnlocked ? encryptString : undefined
  const decrypt = isEncryptionEnabled && isUnlocked ? decryptString : undefined
  const {
    basicNotes, codeNotes, folderNotes, archivedNotes, deletedNotes,
    loading, refetch, deleteNote, archiveNote, unarchiveNote, pinNote,
    permanentDeleteNote, permanentDeleteAll, restoreNote,
  } = useNotes({ encrypt, decrypt })
  const { folders } = useFolders()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<Filter>('all')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // Build displayed notes based on filter
  let displayedNotes: Note[] = []
  if (filter === 'archived') {
    displayedNotes = archivedNotes
  } else if (filter === 'trash') {
    displayedNotes = deletedNotes
  } else if (filter === 'pinned') {
    const allActive = [...basicNotes, ...codeNotes.java, ...codeNotes.javascript, ...codeNotes.python, ...codeNotes.sql]
    displayedNotes = allActive.filter(n => n.pinned)
  } else {
    if (activeFolder && folderNotes[activeFolder]) {
      displayedNotes = folderNotes[activeFolder]
    } else {
      displayedNotes = [...basicNotes, ...codeNotes.java, ...codeNotes.javascript, ...codeNotes.python, ...codeNotes.sql]
    }
  }

  if (search) {
    const q = search.toLowerCase()
    displayedNotes = displayedNotes.filter(n => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q))
  }

  const FILTERS: { value: Filter; label: string; icon: string; count?: number }[] = [
    { value: 'all', label: 'All', icon: 'document-text-outline' },
    { value: 'pinned', label: 'Pinned', icon: 'pin-outline' },
    { value: 'archived', label: 'Archived', icon: 'archive-outline', count: archivedNotes.length },
    { value: 'trash', label: 'Trash', icon: 'trash-outline', count: deletedNotes.length },
  ]

  const handleTrashAction = (note: Note) => {
    Alert.alert(note.title || 'Untitled', 'Choose an action', [
      { text: 'Restore', onPress: async () => { await restoreNote(note.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } },
      { text: 'Delete Forever', style: 'destructive', onPress: async () => { await permanentDeleteNote(note.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleArchiveAction = (note: Note) => {
    Alert.alert(note.title || 'Untitled', 'Unarchive this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unarchive', onPress: async () => { await unarchiveNote(note.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } },
    ])
  }

  const handleEmptyTrash = () => {
    if (deletedNotes.length === 0) return
    Alert.alert('Empty Trash', `Permanently delete ${deletedNotes.length} note${deletedNotes.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => { await permanentDeleteAll(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } },
    ])
  }

  const renderNoteItem = ({ item }: { item: Note }) => {
    if (filter === 'trash') {
      return (
        <TouchableOpacity onPress={() => handleTrashAction(item)} style={{
          backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 8,
          borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.title || 'Untitled'}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Deleted {new Date(item.deleted_at!).toLocaleDateString()}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )
    }

    if (filter === 'archived') {
      return (
        <TouchableOpacity onPress={() => handleArchiveAction(item)} onLongPress={() => router.push(`/(tabs)/(notes)/${item.id}`)} style={{
          backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 8,
          borderWidth: 1, borderColor: colors.border, borderLeftWidth: item.color ? 4 : 1, borderLeftColor: item.color || colors.border,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Ionicons name="archive-outline" size={18} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.title || 'Untitled'}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.content?.replace(/<[^>]*>/g, '').slice(0, 80) || 'Empty'}</Text>
          </View>
          <Ionicons name="arrow-undo-outline" size={16} color={colors.accent} />
        </TouchableOpacity>
      )
    }

    if (viewMode === 'grid') {
      return <NoteCard note={item} colors={colors} onPress={() => router.push(`/(tabs)/(notes)/${item.id}`)} />
    }

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/(notes)/${item.id}`)} style={{
        backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 8,
        borderWidth: 1, borderColor: colors.border, borderLeftWidth: item.color ? 4 : 1, borderLeftColor: item.color || colors.border,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        {item.pinned && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.title || 'Untitled'}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.content?.replace(/<[^>]*>/g, '').slice(0, 80) || 'Empty'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Notes</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {filter !== 'archived' && filter !== 'trash' && (
              <TouchableOpacity onPress={() => { setViewMode(v => v === 'grid' ? 'list' : 'grid'); Haptics.selectionAsync() }}>
                <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {filter === 'trash' && deletedNotes.length > 0 && (
              <TouchableOpacity onPress={handleEmptyTrash}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.error }}>Empty</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/(settings)')}>
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }} value={search} onChangeText={setSearch} placeholder="Search notes..." placeholderTextColor={colors.textSecondary} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Filter tabs */}
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={item => item.value}
          style={{ marginTop: 10 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => { setFilter(f.value); setActiveFolder(null); Haptics.selectionAsync() }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8,
                backgroundColor: filter === f.value ? colors.accent : colors.surfaceSecondary }}
            >
              <Ionicons name={f.icon as any} size={14} color={filter === f.value ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.value ? '#fff' : colors.text }}>{f.label}</Text>
              {f.count !== undefined && f.count > 0 && (
                <View style={{ backgroundColor: filter === f.value ? 'rgba(255,255,255,0.3)' : colors.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: filter === f.value ? '#fff' : colors.textSecondary }}>{f.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />

        {/* Folder filters (only in 'all' mode) */}
        {filter === 'all' && folders.length > 0 && (
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: 'All' }, ...folders]}
            keyExtractor={item => item.id || 'all'}
            style={{ marginTop: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setActiveFolder(item.id); Haptics.selectionAsync() }}
                style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6,
                  backgroundColor: activeFolder === item.id ? colors.accent + '20' : 'transparent',
                  borderWidth: 1, borderColor: activeFolder === item.id ? colors.accent : colors.border }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: activeFolder === item.id ? colors.accent : colors.textSecondary }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {loading && displayedNotes.length === 0 ? (
        <ScreenSkeleton count={6} variant="card" />
      ) : (
        <FlatList
          data={displayedNotes}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' && filter !== 'archived' && filter !== 'trash' ? 2 : 1}
          key={`${viewMode}-${filter}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={viewMode === 'grid' && filter !== 'archived' && filter !== 'trash' ? { gap: 12 } : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            filter === 'trash' ? <EmptyState icon="trash-outline" title="Trash is empty" subtitle="Deleted notes will appear here" /> :
            filter === 'archived' ? <EmptyState icon="archive-outline" title="No archived notes" subtitle="Archived notes will appear here" /> :
            filter === 'pinned' ? <EmptyState icon="pin-outline" title="No pinned notes" subtitle="Pin important notes to find them quickly" /> :
            <EmptyState icon="document-text-outline" title="No notes yet" subtitle="Tap + to create your first note" />
          }
          renderItem={renderNoteItem}
        />
      )}

      {filter !== 'archived' && filter !== 'trash' && <FAB onPress={() => router.push('/(tabs)/(notes)/new')} />}
    </View>
  )
}
