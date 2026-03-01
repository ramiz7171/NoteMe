import { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl, Alert, Modal, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useFiles } from '../../../src/hooks/useFiles'
import { ScreenSkeleton } from '../../../src/components/ui/SkeletonLoader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { FAB } from '../../../src/components/ui/FAB'
import { FOLDER_COLORS } from '@shared/lib/constants'
import type { FileFolder, UserFile, FileFolderColor } from '@shared/types'
import * as Haptics from 'expo-haptics'
import * as Clipboard from 'expo-clipboard'

const FOLDER_COLOR_MAP: Record<string, string> = { blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', red: '#ef4444', purple: '#8b5cf6', gray: '#6b7280' }
const FILE_ICONS: Record<string, string> = { image: 'image', video: 'videocam', audio: 'musical-notes', 'application/pdf': 'document-text', text: 'document' }
const SHARE_EXPIRY_OPTIONS = [
  { label: '24 hours', value: '24h' as const },
  { label: '7 days', value: '7d' as const },
  { label: '30 days', value: '30d' as const },
  { label: 'Never', value: 'never' as const },
]

function getFileIcon(type: string): string {
  for (const [key, icon] of Object.entries(FILE_ICONS)) { if (type.includes(key)) return icon }
  return 'document'
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesScreen() {
  const { colors } = useTheme()
  const { fileFolders, userFiles, loading, pickAndUploadFiles, deleteFile, deleteFileFolder, downloadAndShareFile, createFileFolder, renameFileFolder, updateFileFolderColor, generateShareLink, revokeShareLink, getFolderContents, getBreadcrumbs } = useFiles()
  const router = useRouter()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  // New folder modal
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<FileFolderColor>('blue')
  // Folder actions
  const [editFolder, setEditFolder] = useState<FileFolder | null>(null)
  // Share modal
  const [shareFile, setShareFile] = useState<UserFile | null>(null)
  const [shareExpiry, setShareExpiry] = useState<'24h' | '7d' | '30d' | 'never'>('7d')
  const [sharePassword, setSharePassword] = useState('')
  const [shareLink, setShareLink] = useState<string | null>(null)

  const { folders, files } = getFolderContents(currentFolderId)
  const breadcrumbs = getBreadcrumbs(currentFolderId)

  // Apply search filter
  let filteredFolders = folders
  let filteredFiles = files
  if (search.trim()) {
    const q = search.toLowerCase()
    filteredFolders = folders.filter(f => f.name.toLowerCase().includes(q))
    filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(q))
  }

  const items = [...filteredFolders.map(f => ({ ...f, _type: 'folder' as const })), ...filteredFiles.map(f => ({ ...f, _type: 'file' as const }))]

  const onRefresh = useCallback(async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 500)); setRefreshing(false) }, [])

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const { errors } = await pickAndUploadFiles(currentFolderId)
    if (errors.length > 0) Alert.alert('Upload Errors', errors.join('\n'))
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFileFolder(newFolderName.trim(), currentFolderId, newFolderColor)
    setShowNewFolder(false); setNewFolderName(''); setNewFolderColor('blue')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const handleFolderAction = (folder: FileFolder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setEditFolder(folder)
  }

  const handleRenameFolder = () => {
    if (!editFolder) return
    Alert.prompt?.('Rename Folder', 'Enter new name:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rename', onPress: (name) => { if (name?.trim()) { renameFileFolder(editFolder.id, name.trim()); setEditFolder(null) } } },
    ], 'plain-text', editFolder.name)
    // Fallback for Android (no Alert.prompt)
    if (!Alert.prompt) setEditFolder(editFolder)
  }

  const handleFileAction = (file: UserFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(file.file_name, formatSize(file.file_size), [
      { text: 'Share Link', onPress: () => { setShareFile(file); setShareLink(null); setSharePassword(''); setShareExpiry('7d') } },
      { text: 'Download', onPress: () => downloadAndShareFile(file) },
      { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete File', `Delete "${file.file_name}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteFile(file.id) }]) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleGenerateShareLink = async () => {
    if (!shareFile) return
    const id = await generateShareLink(shareFile.id, shareExpiry, sharePassword || undefined)
    if (id) {
      const link = `https://criptnote.app/share/${id}`
      setShareLink(link)
      await Clipboard.setStringAsync(link)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleRevokeShare = async () => {
    if (!shareFile) return
    await revokeShareLink(shareFile.id)
    setShareFile(null)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Files</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setShowNewFolder(true)}><Ionicons name="folder-open" size={22} color={colors.accent} /></TouchableOpacity>
            <TouchableOpacity onPress={handleUpload}><Ionicons name="cloud-upload" size={22} color={colors.accent} /></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(settings)')}><Ionicons name="settings-outline" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        </View>
        {/* Search */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.text }} value={search} onChangeText={setSearch} placeholder="Search files..." placeholderTextColor={colors.textSecondary} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
        {/* Breadcrumbs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {breadcrumbs.map((b, i) => (
            <TouchableOpacity key={b.id || 'root'} onPress={() => { setCurrentFolderId(b.id); Haptics.selectionAsync() }} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={{ marginHorizontal: 2 }} />}
              <Text style={{ fontSize: 13, color: i === breadcrumbs.length - 1 ? colors.text : colors.accent, fontWeight: i === breadcrumbs.length - 1 ? '700' : '400' }}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <ScreenSkeleton count={5} variant="list" />
      ) : (
        <FlatList data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="folder-open-outline" title="Empty folder" subtitle="Upload files or create folders" />}
          renderItem={({ item }) => item._type === 'folder' ? (
            <TouchableOpacity onPress={() => { setCurrentFolderId(item.id); Haptics.selectionAsync() }}
              onLongPress={() => handleFolderAction(item as FileFolder)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="folder" size={24} color={FOLDER_COLOR_MAP[(item as FileFolder).color] || colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{(item as FileFolder).name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push(`/(tabs)/(files)/preview/${item.id}`)}
              onLongPress={() => handleFileAction(item as UserFile)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={getFileIcon((item as UserFile).file_type) as any} size={24} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{(item as UserFile).file_name}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{formatSize((item as UserFile).file_size)}</Text>
              </View>
              {(item as UserFile).share_id && <Ionicons name="link" size={16} color={colors.accent} />}
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={handleUpload} />

      {/* New Folder Modal */}
      <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowNewFolder(false)}>
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 20, padding: 24, width: 320 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>New Folder</Text>
            <TextInput value={newFolderName} onChangeText={setNewFolderName} placeholder="Folder name" autoFocus
              style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
              placeholderTextColor={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
              {FOLDER_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewFolderColor(c)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: FOLDER_COLOR_MAP[c], borderWidth: newFolderColor === c ? 3 : 1, borderColor: newFolderColor === c ? colors.accent : colors.border, justifyContent: 'center', alignItems: 'center' }}>
                  {newFolderColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleCreateFolder} disabled={!newFolderName.trim()}
              style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center', opacity: newFolderName.trim() ? 1 : 0.5 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder Edit Modal */}
      <Modal visible={!!editFolder} transparent animationType="fade" onRequestClose={() => setEditFolder(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setEditFolder(null)}>
          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>{editFolder?.name}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {FOLDER_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => { if (editFolder) { updateFileFolderColor(editFolder.id, c); setEditFolder({ ...editFolder, color: c }); Haptics.selectionAsync() } }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: FOLDER_COLOR_MAP[c], borderWidth: editFolder?.color === c ? 3 : 1, borderColor: editFolder?.color === c ? colors.accent : colors.border, justifyContent: 'center', alignItems: 'center' }}>
                  {editFolder?.color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => { if (editFolder) { const name = editFolder.name; Alert.alert('Rename', '', [{ text: 'Cancel' }, { text: 'OK', onPress: () => {} }]); setEditFolder(null) } }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <Ionicons name="pencil" size={20} color={colors.text} /><Text style={{ fontSize: 16, color: colors.text }}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (editFolder) { Alert.alert('Delete Folder', `Delete "${editFolder.name}" and all its files?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteFileFolder(editFolder.id); setEditFolder(null) } }]) } }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
              <Ionicons name="trash-outline" size={20} color={colors.error} /><Text style={{ fontSize: 16, color: colors.error }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Link Modal */}
      <Modal visible={!!shareFile} transparent animationType="slide" onRequestClose={() => setShareFile(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Share File</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>{shareFile?.file_name}</Text>

            {shareFile?.share_id && !shareLink ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <Ionicons name="link" size={16} color={colors.accent} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }} numberOfLines={1}>Active share link</Text>
                </View>
                <TouchableOpacity onPress={handleRevokeShare} style={{ alignItems: 'center', padding: 12 }}>
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Revoke Link</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!shareLink ? (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Expires</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {SHARE_EXPIRY_OPTIONS.map(o => (
                    <TouchableOpacity key={o.value} onPress={() => setShareExpiry(o.value)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: shareExpiry === o.value ? colors.accent : colors.surfaceSecondary }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: shareExpiry === o.value ? '#fff' : colors.text }}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Password (optional)</Text>
                <TextInput value={sharePassword} onChangeText={setSharePassword} placeholder="Set a password..." secureTextEntry
                  style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
                  placeholderTextColor={colors.textSecondary} />

                <TouchableOpacity onPress={handleGenerateShareLink}
                  style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Generate Link</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Link copied to clipboard!</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <Ionicons name="link" size={16} color={colors.accent} />
                  <Text style={{ flex: 1, fontSize: 12, color: colors.text }} numberOfLines={1}>{shareLink}</Text>
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(shareLink!)}>
                    <Ionicons name="copy-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShareFile(null)}
                  style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
