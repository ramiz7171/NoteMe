import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { supabase } from '../../src/lib/supabase'
import * as Haptics from 'expo-haptics'

export default function MfaScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [qrUri, setQrUri] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    checkMfaStatus()
  }, [])

  const checkMfaStatus = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const verified = data?.totp?.filter(f => f.status === 'verified') ?? []
      setMfaEnabled(verified.length > 0)
    } catch {}
    setLoading(false)
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CriptNote Mobile' })
    setEnrolling(false)
    if (error) { Alert.alert('Error', error.message); return }
    if (data?.totp?.qr_code) {
      setQrUri(data.totp.qr_code)
      setFactorId(data.id)
    }
  }

  const handleVerify = async () => {
    if (!factorId || verifyCode.length < 6) return
    setVerifying(true)
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) { Alert.alert('Error', challenge.error.message); setVerifying(false); return }
    const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode })
    setVerifying(false)
    if (verify.error) { Alert.alert('Error', verify.error.message); return }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setMfaEnabled(true)
    setQrUri(null)
    setFactorId(null)
    setVerifyCode('')
  }

  const handleDisable = () => {
    Alert.alert('Disable 2FA', 'Are you sure you want to disable two-factor authentication?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        const { data } = await supabase.auth.mfa.listFactors()
        if (data?.totp && data.totp.length > 0) {
          for (const factor of data.totp) {
            await supabase.auth.mfa.unenroll({ factorId: factor.id })
          }
          setMfaEnabled(false)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          Alert.alert('Disabled', '2FA has been disabled.')
        }
      }},
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Two-Factor Auth</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: 20, alignItems: 'center' }}>
        {mfaEnabled && !qrUri ? (
          <>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="shield-checkmark" size={32} color={colors.success} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>2FA is enabled</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>Your account is protected with an authenticator app</Text>

            <TouchableOpacity onPress={handleDisable}
              style={{ backgroundColor: colors.error + '15', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' }}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>Disable 2FA</Text>
            </TouchableOpacity>
          </>
        ) : qrUri ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Scan this QR code with your authenticator app</Text>
            <Image source={{ uri: qrUri }} style={{ width: 200, height: 200, marginBottom: 16, borderRadius: 12 }} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>Then enter the 6-digit code below to verify:</Text>
            <TextInput
              value={verifyCode} onChangeText={t => setVerifyCode(t.replace(/\D/g, ''))}
              keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={colors.textSecondary}
              style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 24, color: colors.text, borderWidth: 1, borderColor: colors.border, width: '100%', textAlign: 'center', letterSpacing: 8, marginBottom: 16 }}
            />
            <TouchableOpacity onPress={handleVerify} disabled={verifying || verifyCode.length < 6}
              style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', opacity: verifying || verifyCode.length < 6 ? 0.5 : 1 }}>
              {verifying ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Verify & Enable</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setQrUri(null); setFactorId(null); setVerifyCode('') }} style={{ marginTop: 12, padding: 12 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={48} color={colors.accent} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>Add an authenticator app for extra security</Text>
            <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', opacity: enrolling ? 0.7 : 1 }} onPress={handleEnroll} disabled={enrolling}>
              {enrolling ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Setup 2FA</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}
