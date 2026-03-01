import { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useNotes } from '../../../src/hooks/useNotes'
import { ScreenSkeleton } from '../../../src/components/ui/SkeletonLoader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { FAB } from '../../../src/components/ui/FAB'
import * as Haptics from 'expo-haptics'

export default function BoardScreen() {
  const { colors } = useTheme()
  const { boardNotes, loading, createNote, refetch } = useNotes()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false) }, [refetch])

  const handleNew = async () => {
    const { data } = await createNote('New Board', '[]', 'board')
    if (data) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/(tabs)/(board)/${data.id}`) }
  }

  let displayed = boardNotes
  if (search) {
    const q = search.toLowerCase()
    displayed = displayed.filter(n => n.title.toLowerCase().includes(q))
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Board</Text>
          <TouchableOpacity onPress={() => router.push('/(settings)')}><Ionicons name="settings-outline" size={22} color={colors.textSecondary} /></TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }} value={search} onChangeText={setSearch} placeholder="Search boards..." placeholderTextColor={colors.textSecondary} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
      </View>

      {loading && displayed.length === 0 ? (
        <ScreenSkeleton count={4} variant="list" />
      ) : (
        <FlatList data={displayed} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="brush-outline" title="No boards yet" subtitle="Tap + to create a whiteboard" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { router.push(`/(tabs)/(board)/${item.id}`); Haptics.selectionAsync() }} style={{ backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{new Date(item.updated_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={handleNew} />
    </View>
  )
}
