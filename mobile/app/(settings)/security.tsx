import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSecurity } from '../../src/context/SecurityContext'
import { useEncryption } from '../../src/context/EncryptionContext'
import { usePasskeys } from '../../src/hooks/usePasskeys'
import * as Haptics from 'expo-haptics'

interface SecurityItem {
  label: string
  icon: string
  route: string
  status: string
  statusColor: string
}

const TIMEOUT_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
]

export default function SecurityHub() {
  const { colors } = useTheme()
  const { isPinEnabled, isBiometricEnabled, idleTimeoutMinutes, setIdleTimeout } = useSecurity()
  const { isEncryptionEnabled } = useEncryption()
  const { biometricType, isEnabled: passkeysEnabled } = usePasskeys()
  const router = useRouter()
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false)

  const items: SecurityItem[] = [
    {
      label: 'Encryption',
      icon: 'lock-closed-outline',
      route: '/(settings)/encryption',
      status: isEncryptionEnabled ? 'Enabled' : 'Disabled',
      statusColor: isEncryptionEnabled ? colors.success : colors.textSecondary,
    },
    {
      label: 'PIN Lock',
      icon: 'keypad-outline',
      route: '/(settings)/pin',
      status: isPinEnabled ? 'Enabled' : 'Not set',
      statusColor: isPinEnabled ? colors.success : colors.textSecondary,
    },
    {
      label: biometricType,
      icon: 'finger-print',
      route: '/(settings)/passkeys',
      status: passkeysEnabled ? 'Enabled' : 'Disabled',
      statusColor: passkeysEnabled ? colors.success : colors.textSecondary,
    },
    {
      label: 'Two-Factor Auth',
      icon: 'shield-checkmark-outline',
      route: '/(settings)/mfa',
      status: 'Configure',
      statusColor: colors.textSecondary,
    },
    {
      label: 'Recovery Codes',
      icon: 'key-outline',
      route: '/(settings)/recovery-codes',
      status: 'View',
      statusColor: colors.textSecondary,
    },
    {
      label: 'Active Sessions',
      icon: 'phone-portrait-outline',
      route: '/(settings)/sessions',
      status: 'Manage',
      statusColor: colors.textSecondary,
    },
    {
      label: 'Audit Log',
      icon: 'list-outline',
      route: '/(settings)/audit-log',
      status: 'View',
      statusColor: colors.textSecondary,
    },
  ]

  const securityScore = [isEncryptionEnabled, isPinEnabled, passkeysEnabled, isBiometricEnabled].filter(Boolean).length
  const maxScore = 4

  const currentTimeoutLabel = TIMEOUT_OPTIONS.find(o => o.value === idleTimeoutMinutes)?.label ?? `${idleTimeoutMinutes} min`

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg,
        borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Security</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Security Score */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 20,
          borderWidth: 1, borderColor: colors.border, alignItems: 'center',
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
            backgroundColor: securityScore >= 3 ? colors.success + '20' : securityScore >= 2 ? colors.warning + '20' : colors.error + '20',
            marginBottom: 12,
          }}>
            <Ionicons
              name={securityScore >= 3 ? 'shield-checkmark' : 'shield-half-outline'}
              size={32}
              color={securityScore >= 3 ? colors.success : securityScore >= 2 ? colors.warning : colors.error}
            />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Security Score</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {securityScore}/{maxScore} protections active
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {Array.from({ length: maxScore }).map((_, i) => (
              <View key={i} style={{
                width: 40, height: 4, borderRadius: 2,
                backgroundColor: i < securityScore ? colors.success : colors.border,
              }} />
            ))}
          </View>
        </View>

        {/* Auto-Lock (configurable) */}
        <TouchableOpacity
          onPress={() => { setShowTimeoutPicker(true); Haptics.selectionAsync() }}
          style={{
            backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 20,
            borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center',
          }}
        >
          <Ionicons name="timer-outline" size={22} color={colors.accent} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Auto-Lock</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Lock app after inactivity</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: idleTimeoutMinutes > 0 ? colors.success : colors.textSecondary }}>{currentTimeoutLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Security Items */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => { router.push(item.route as any); Haptics.selectionAsync() }}
              style={{
                flexDirection: 'row', alignItems: 'center', padding: 16,
                borderBottomWidth: i < items.length - 1 ? 0.5 : 0, borderBottomColor: colors.border,
              }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent + '15',
                justifyContent: 'center', alignItems: 'center', marginRight: 12,
              }}>
                <Ionicons name={item.icon as any} size={18} color={colors.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: item.statusColor, marginRight: 8 }}>{item.status}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Timeout Picker Modal */}
      <Modal visible={showTimeoutPicker} transparent animationType="fade" onRequestClose={() => setShowTimeoutPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowTimeoutPicker(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Auto-Lock Timeout</Text>
            {TIMEOUT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={async () => {
                  await setIdleTimeout(opt.value)
                  Haptics.selectionAsync()
                  setShowTimeoutPicker(false)
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderRadius: 12, marginBottom: 4,
                  backgroundColor: idleTimeoutMinutes === opt.value ? colors.accent + '15' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 16, color: idleTimeoutMinutes === opt.value ? colors.accent : colors.text, fontWeight: idleTimeoutMinutes === opt.value ? '700' : '400' }}>{opt.label}</Text>
                {idleTimeoutMinutes === opt.value && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
