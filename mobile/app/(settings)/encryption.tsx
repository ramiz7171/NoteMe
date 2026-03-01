import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useEncryption } from '../../src/context/EncryptionContext'
import * as Haptics from 'expo-haptics'

export default function EncryptionScreen() {
  const { colors } = useTheme()
  const { isEncryptionEnabled, isUnlocked, enableEncryption, disableEncryption, unlockEncryption, lockEncryption } = useEncryption()
  const router = useRouter()
  const [passphrase, setPassphrase] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleEnable = async () => {
    if (!passphrase) return
    setLoading(true)
    await enableEncryption(passphrase, setProgress)
    setLoading(false)
    setPassphrase('')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const handleDisable = async () => {
    if (!passphrase) return
    Alert.alert('Disable Encryption', 'All notes will be decrypted. Continue?', [
      { text: 'Cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        setLoading(true)
        await disableEncryption(passphrase, setProgress)
        setLoading(false)
        setPassphrase('')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }},
    ])
  }

  const handleUnlock = async () => {
    if (!passphrase) return
    const ok = await unlockEncryption(passphrase)
    if (ok) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setPassphrase('') }
    else Alert.alert('Error', 'Wrong passphrase')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Encryption</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Ionicons name={isEncryptionEnabled ? 'lock-closed' : 'lock-open'} size={24} color={isEncryptionEnabled ? colors.success : colors.textSecondary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{isEncryptionEnabled ? (isUnlocked ? 'Encryption Unlocked' : 'Encryption Locked') : 'Encryption Disabled'}</Text>
        </View>

        <TextInput style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
          value={passphrase} onChangeText={setPassphrase} placeholder="Encryption passphrase" placeholderTextColor={colors.textSecondary} secureTextEntry />

        {loading && progress > 0 && (
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: colors.accent, borderRadius: 3, width: `${progress}%` }} />
          </View>
        )}

        {!isEncryptionEnabled ? (
          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleEnable} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Enable Encryption</Text>}
          </TouchableOpacity>
        ) : !isUnlocked ? (
          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' }} onPress={handleUnlock}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Unlock</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 12 }}>
            <TouchableOpacity style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 16, alignItems: 'center' }} onPress={lockEncryption}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Lock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: colors.error + '15', borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleDisable} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.error} /> : <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>Disable Encryption</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}
