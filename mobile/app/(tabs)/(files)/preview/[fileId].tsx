import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useTheme } from '../../../../src/context/ThemeContext'
import { useFiles } from '../../../../src/hooks/useFiles'

export default function FilePreview() {
  const { fileId } = useLocalSearchParams<{ fileId: string }>()
  const { colors } = useTheme()
  const { userFiles, getFileUrl, downloadAndShareFile } = useFiles()
  const router = useRouter()
  const file = userFiles.find(f => f.id === fileId)

  if (!file) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.accent} /></View>

  const url = getFileUrl(file.storage_path)
  const isImage = file.file_type.startsWith('image/')

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => downloadAndShareFile(file)}>
          <Ionicons name="share-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        {isImage ? (
          <Image source={{ uri: url }} style={{ width: '100%', height: '80%' }} contentFit="contain" />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="document" size={64} color={colors.textSecondary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>{file.file_name}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{file.file_type}</Text>
            <TouchableOpacity onPress={() => downloadAndShareFile(file)} style={{ marginTop: 24, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Download & Share</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}
