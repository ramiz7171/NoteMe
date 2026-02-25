import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export function useImageUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null
    setUploading(true)

    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage
      .from('note-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    setUploading(false)

    if (error) {
      console.error('Image upload error:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('note-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  return { uploadImage, uploading }
}
