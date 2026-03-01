import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { supabase } from '../../src/lib/supabase'

export default function SharedFileScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>()
  const { colors } = useTheme()
  const [status, setStatus] = useState<'loading' | 'found' | 'expired' | 'not_found' | 'password_required'>('loading')
  const [file, setFile] = useState<any>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc('get_shared_file', { p_share_id: shareId })
      if (error || !data) { setStatus('not_found'); return }
      const f = data as any
      if (f.share_expires_at && new Date(f.share_expires_at) < new Date()) { setStatus('expired'); return }
      if (f.password_protected) { setFile(f); setStatus('password_required'); return }
      const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(f.storage_path)
      setFile(f); setFileUrl(urlData.publicUrl); setStatus('found')
    }
    load()
  }, [shareId])

  const handlePassword = async () => {
    const { data } = await supabase.rpc('verify_share_password', { p_share_id: shareId, p_password: password })
    if (data) {
      const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(file.storage_path)
      setFileUrl(urlData.publicUrl); setStatus('found')
    }
  }

  if (status === 'loading') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.accent} /></View>
  if (status === 'not_found') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Ionicons name="alert-circle" size={48} color={colors.error} /><Text style={{ color: colors.text, marginTop: 12, fontSize: 16 }}>File not found</Text></View>
  if (status === 'expired') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Ionicons name="time" size={48} color={colors.warning} /><Text style={{ color: colors.text, marginTop: 12, fontSize: 16 }}>Link expired</Text></View>

  if (status === 'password_required') return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border }}>
        <Ionicons name="lock-closed" size={32} color={colors.accent} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 16 }}>This file is password protected</Text>
        <TextInput style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
          value={password} onChangeText={setPassword} placeholder="Enter password" placeholderTextColor={colors.textSecondary} secureTextEntry />
        <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={handlePassword}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const isImage = file?.file_type?.startsWith('image/')
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {isImage ? <Image source={{ uri: fileUrl }} style={{ width: '100%', height: '70%' }} contentFit="contain" /> :
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="document" size={64} color={colors.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>{file?.file_name}</Text>
        </View>
      }
    </View>
  )
}
