import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import * as Haptics from 'expo-haptics'

export default function PasswordChangeScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword

  const handleChange = async () => {
    if (!isValid) return
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Success', 'Password updated successfully.', [{ text: 'OK', onPress: () => router.back() }])
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Change Password</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>New Password</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} placeholder="Min 8 characters"
            style={{ flex: 1, padding: 14, fontSize: 15, color: colors.text }} placeholderTextColor={colors.textSecondary} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 14 }}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Confirm Password</Text>
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholder="Re-enter password"
          style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
          placeholderTextColor={colors.textSecondary} />

        {confirmPassword && newPassword !== confirmPassword && (
          <Text style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>Passwords don't match</Text>
        )}
        {newPassword && newPassword.length < 8 && (
          <Text style={{ fontSize: 12, color: colors.warning, marginBottom: 8 }}>Password must be at least 8 characters</Text>
        )}

        <TouchableOpacity onPress={handleChange} disabled={!isValid || saving}
          style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, opacity: isValid && !saving ? 1 : 0.5 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}
