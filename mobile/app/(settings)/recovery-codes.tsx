import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useAuth } from '../../src/context/AuthContext'
import { generateRecoveryCodes } from '@shared/lib/recoveryCode'
import { supabase } from '../../src/lib/supabase'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'

export default function RecoveryCodesScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [codes, setCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!user) return
    setLoading(true)
    try {
      const newCodes = await generateRecoveryCodes(supabase, user.id)
      setCodes(newCodes)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e: any) { Alert.alert('Error', e.message) }
    setLoading(false)
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(codes.join('\n'))
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Alert.alert('Copied', 'Recovery codes copied to clipboard')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Recovery Codes</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={{ padding: 20 }}>
        {codes.length > 0 ? (
          <>
            <Text style={{ fontSize: 14, color: colors.warning, marginBottom: 16 }}>Save these codes in a safe place. Each can only be used once.</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
              {codes.map((code, i) => (
                <Text key={i} style={{ fontSize: 16, color: colors.text, fontFamily: 'monospace', paddingVertical: 4, fontWeight: '600' }}>{code}</Text>
              ))}
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={handleCopy}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Copy All</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleGenerate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Generate Recovery Codes</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
