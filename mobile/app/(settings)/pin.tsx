import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSecurity } from '../../src/context/SecurityContext'
import * as Haptics from 'expo-haptics'

export default function PinScreen() {
  const { colors } = useTheme()
  const { isPinEnabled, setupPin, removePin, unlockWithPin } = useSecurity()
  const router = useRouter()
  const [mode, setMode] = useState<'view' | 'setup' | 'change'>('view')
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')

  const handleSetup = async () => {
    if (pin.length < 4) { Alert.alert('Error', 'PIN must be at least 4 digits'); return }
    if (pin !== confirm) { Alert.alert('Error', 'PINs do not match'); return }
    await setupPin(pin)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Alert.alert('Success', 'PIN has been set.', [{ text: 'OK', onPress: () => router.back() }])
  }

  const handleChange = async () => {
    if (!currentPin) { Alert.alert('Error', 'Enter your current PIN'); return }
    const valid = await unlockWithPin(currentPin)
    if (!valid) { Alert.alert('Error', 'Current PIN is incorrect'); return }
    if (pin.length < 4) { Alert.alert('Error', 'New PIN must be at least 4 digits'); return }
    if (pin !== confirm) { Alert.alert('Error', 'PINs do not match'); return }
    await setupPin(pin)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Alert.alert('Success', 'PIN has been changed.', [{ text: 'OK', onPress: () => router.back() }])
  }

  const handleRemove = () => {
    Alert.alert('Remove PIN', 'Are you sure you want to remove your PIN lock?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        removePin()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        router.back()
      }},
    ])
  }

  const resetFields = () => { setCurrentPin(''); setPin(''); setConfirm('') }

  const pinInput = (value: string, onChange: (t: string) => void, placeholder: string) => (
    <TextInput
      style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 20, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16, textAlign: 'center', letterSpacing: 8 }}
      value={value} onChangeText={t => onChange(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder={placeholder} placeholderTextColor={colors.textSecondary}
    />
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>PIN Lock</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: 20 }}>
        {isPinEnabled && mode === 'view' ? (
          <View>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>PIN is enabled</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Your app is protected with a PIN lock</Text>
            </View>

            <TouchableOpacity onPress={() => { resetFields(); setMode('change') }}
              style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Change PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRemove}
              style={{ backgroundColor: colors.error + '15', borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>Remove PIN</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'change' ? (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Current PIN</Text>
            {pinInput(currentPin, setCurrentPin, '----')}

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>New PIN</Text>
            {pinInput(pin, setPin, '----')}

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Confirm New PIN</Text>
            {pinInput(confirm, setConfirm, '----')}

            <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }} onPress={handleChange}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Change PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('view')} style={{ alignItems: 'center', padding: 12 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>New PIN (4-6 digits)</Text>
            {pinInput(pin, setPin, '----')}

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Confirm PIN</Text>
            {pinInput(confirm, setConfirm, '----')}

            <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' }} onPress={handleSetup}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Set PIN</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}
