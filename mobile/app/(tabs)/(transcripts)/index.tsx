import { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useTranscripts } from '../../../src/hooks/useTranscripts'
import { ScreenSkeleton } from '../../../src/components/ui/SkeletonLoader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { FAB } from '../../../src/components/ui/FAB'
import * as Haptics from 'expo-haptics'

const STATUS_COLORS: Record<string, string> = { processing: '#eab308', completed: '#22c55e', failed: '#ef4444' }

export default function TranscriptsScreen() {
  const { colors } = useTheme()
  const { transcripts, loading, refetch } = useTranscripts()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  let displayed = transcripts
  if (search) {
    const q = search.toLowerCase()
    displayed = displayed.filter(t => t.title.toLowerCase().includes(q) || t.transcript_text?.toLowerCase().includes(q))
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Transcripts</Text>
          <TouchableOpacity onPress={() => router.push('/(settings)')}><Ionicons name="settings-outline" size={22} color={colors.textSecondary} /></TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }} value={search} onChangeText={setSearch} placeholder="Search transcripts..." placeholderTextColor={colors.textSecondary} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
      </View>

      {loading && displayed.length === 0 ? (
        <ScreenSkeleton count={4} variant="list" />
      ) : (
        <FlatList data={displayed} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="mic-outline" title="No transcripts yet" subtitle="Tap the mic button to start recording" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { router.push(`/(tabs)/(transcripts)/${item.id}`); Haptics.selectionAsync() }} style={{ backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{item.title}</Text>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLORS[item.status] || colors.textSecondary }} />
              </View>
              <Text numberOfLines={2} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>{item.transcript_text?.slice(0, 120) || 'Processing...'}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                {item.duration_seconds > 0 && <Text style={{ fontSize: 11, color: colors.textSecondary }}>{Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={() => router.push('/(tabs)/(transcripts)/record')} icon="mic" color="#ef4444" />
    </View>
  )
}
