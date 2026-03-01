import { useState, useCallback, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useMeetings } from '../../../src/hooks/useMeetings'
import { ScreenSkeleton } from '../../../src/components/ui/SkeletonLoader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { FAB } from '../../../src/components/ui/FAB'
import type { MeetingStatus } from '@shared/types'
import * as Haptics from 'expo-haptics'

const STATUS_COLORS: Record<MeetingStatus, string> = { scheduled: '#3b82f6', in_progress: '#eab308', completed: '#22c55e', cancelled: '#6b7280' }
const STATUS_LABELS: Record<MeetingStatus, string> = { scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function MeetingsScreen() {
  const { colors } = useTheme()
  const { meetings, upcomingMeetings, completedMeetings, loading, refetch } = useMeetings()
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const cancelledMeetings = useMemo(() => meetings.filter(m => m.status === 'cancelled'), [meetings])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  let displayed = filter === 'upcoming' ? upcomingMeetings :
    filter === 'completed' ? completedMeetings :
    filter === 'cancelled' ? cancelledMeetings : meetings

  if (search) {
    const q = search.toLowerCase()
    displayed = displayed.filter(m => m.title.toLowerCase().includes(q) || m.participants?.some(p => p.toLowerCase().includes(q)))
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Meetings</Text>
          <TouchableOpacity onPress={() => router.push('/(settings)')}><Ionicons name="settings-outline" size={22} color={colors.textSecondary} /></TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 10 }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }} value={search} onChangeText={setSearch} placeholder="Search meetings..." placeholderTextColor={colors.textSecondary} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Filters */}
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={f => f.value}
          renderItem={({ item: f }) => (
            <TouchableOpacity onPress={() => { setFilter(f.value); Haptics.selectionAsync() }}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: filter === f.value ? colors.accent : colors.surfaceSecondary }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.value ? '#fff' : colors.text }}>{f.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && displayed.length === 0 ? (
        <ScreenSkeleton count={4} variant="list" />
      ) : (
        <FlatList data={displayed} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No meetings" subtitle="Schedule your first meeting" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { router.push(`/(tabs)/(meetings)/${item.id}`); Haptics.selectionAsync() }} style={{ backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{item.title}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: STATUS_COLORS[item.status as MeetingStatus] + '20' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: STATUS_COLORS[item.status as MeetingStatus] }}>{STATUS_LABELS[item.status as MeetingStatus]}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{new Date(item.meeting_date).toLocaleDateString()}</Text>
                </View>
                {item.participants.length > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.participants.length}</Text>
                </View>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={() => router.push('/(tabs)/(meetings)/new')} />
    </View>
  )
}
