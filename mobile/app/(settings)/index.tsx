import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useAuth } from '../../src/context/AuthContext'
import * as Haptics from 'expo-haptics'

const SECTIONS = [
  { title: 'Account', items: [
    { label: 'Profile', icon: 'person-outline', route: '/(settings)/profile' },
    { label: 'Change Password', icon: 'lock-open-outline', route: '/(settings)/password' },
    { label: 'Appearance', icon: 'color-palette-outline', route: '/(settings)/appearance' },
    { label: 'AI Preferences', icon: 'sparkles-outline', route: '/(settings)/ai-preferences' },
    { label: 'Notifications', icon: 'notifications-outline', route: '/(settings)/notifications' },
  ]},
  { title: 'Security', items: [
    { label: 'Security Hub', icon: 'shield-checkmark-outline', route: '/(settings)/security' },
    { label: 'Encryption', icon: 'lock-closed-outline', route: '/(settings)/encryption' },
    { label: 'PIN Lock', icon: 'keypad-outline', route: '/(settings)/pin' },
    { label: 'Biometrics', icon: 'finger-print', route: '/(settings)/passkeys' },
    { label: 'Two-Factor Auth', icon: 'shield-outline', route: '/(settings)/mfa' },
    { label: 'Recovery Codes', icon: 'key-outline', route: '/(settings)/recovery-codes' },
    { label: 'Active Sessions', icon: 'phone-portrait-outline', route: '/(settings)/sessions' },
    { label: 'Audit Log', icon: 'list-outline', route: '/(settings)/audit-log' },
  ]},
]

export default function SettingsScreen() {
  const { colors } = useTheme()
  const { profile, signOut } = useAuth()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Profile card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{(profile?.display_name || profile?.username || '?')[0].toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{profile?.display_name || profile?.username}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>@{profile?.username}</Text>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{section.title}</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {section.items.map((item, i) => (
                <TouchableOpacity key={item.route} onPress={() => { router.push(item.route as any); Haptics.selectionAsync() }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < section.items.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
                  <Ionicons name={item.icon as any} size={20} color={colors.accent} style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={async () => { await signOut(); router.replace('/(auth)/login') }}
          style={{ backgroundColor: colors.error + '15', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
