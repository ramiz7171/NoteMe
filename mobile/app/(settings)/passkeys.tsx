import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSecurity } from '../../src/context/SecurityContext'
import { getBiometricType } from '../../src/lib/biometric'
import { useState, useEffect } from 'react'

export default function PasskeysScreen() {
  const { colors } = useTheme()
  const { isBiometricEnabled } = useSecurity()
  const router = useRouter()
  const [bioType, setBioType] = useState('Biometric')

  useEffect(() => { getBiometricType().then(setBioType) }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Biometrics</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Ionicons name="finger-print" size={64} color={isBiometricEnabled ? colors.success : colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{bioType}</Text>
        <Text style={{ fontSize: 14, color: isBiometricEnabled ? colors.success : colors.textSecondary, textAlign: 'center' }}>
          {isBiometricEnabled ? `${bioType} is available and will be used to unlock the app` : `${bioType} is not available on this device`}
        </Text>
      </View>
    </View>
  )
}
