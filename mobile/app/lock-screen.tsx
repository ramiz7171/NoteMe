import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSecurity } from '../src/context/SecurityContext'
import { useTheme } from '../src/context/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

export default function LockScreen() {
  const { unlockWithPin, unlockWithPassword, unlockWithBiometric, isPinEnabled, isBiometricEnabled } = useSecurity()
  const { colors } = useTheme()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usePassword, setUsePassword] = useState(!isPinEnabled)

  const handleUnlock = async () => {
    setError('')
    setLoading(true)
    let success = false
    if (usePassword) {
      success = await unlockWithPassword(input)
    } else {
      success = await unlockWithPin(input)
    }
    setLoading(false)
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)/(notes)')
    } else {
      setError(usePassword ? 'Incorrect password' : 'Incorrect PIN')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const handleBiometric = async () => {
    const success = await unlockWithBiometric()
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)/(notes)')
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Ionicons name="lock-closed" size={48} color={colors.accent} />
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 16 }}>CriptNote Locked</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border }}>
        {error ? <View style={{ backgroundColor: colors.error + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
          <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
        </View> : null}

        <TextInput
          style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 18, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16, textAlign: 'center', letterSpacing: usePassword ? 0 : 6 }}
          value={input} onChangeText={setInput} placeholder={usePassword ? 'Password' : 'PIN'}
          placeholderTextColor={colors.textSecondary} secureTextEntry keyboardType={usePassword ? 'default' : 'number-pad'}
        />

        <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleUnlock} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Unlock</Text>}
        </TouchableOpacity>

        {isBiometricEnabled && (
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 }} onPress={handleBiometric}>
            <Ionicons name="finger-print" size={20} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Use Biometrics</Text>
          </TouchableOpacity>
        )}

        {isPinEnabled && (
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => { setUsePassword(!usePassword); setInput(''); setError('') }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{usePassword ? 'Use PIN instead' : 'Use password instead'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
