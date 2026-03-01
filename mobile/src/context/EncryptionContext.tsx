import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import {
  deriveKey, generateSalt, encryptContent, decryptContent, isEncrypted,
  encryptFileData, decryptFileData, saltToBase64, base64ToSalt,
} from '../lib/crypto'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Json } from '@shared/types'

interface EncryptionContextType {
  isEncryptionEnabled: boolean
  isUnlocked: boolean
  unlockEncryption: (passphrase: string) => Promise<boolean>
  lockEncryption: () => void
  enableEncryption: (passphrase: string, onProgress?: (pct: number) => void) => Promise<void>
  disableEncryption: (passphrase: string, onProgress?: (pct: number) => void) => Promise<void>
  encryptString: (plaintext: string) => Promise<string>
  decryptString: (ciphertext: string) => Promise<string>
  fileEncryptionEnabled: boolean
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined)

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isEnabled, setIsEnabled] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const cryptoKeyRef = useRef<CryptoKey | null>(null)
  const saltRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (!user) return
    const loadState = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single()
      if (data?.preferences) {
        const prefs = data.preferences as Record<string, unknown>
        setIsEnabled(!!prefs.encryption_enabled)
        if (prefs.encryption_salt) {
          saltRef.current = base64ToSalt(prefs.encryption_salt as string)
        }
      }
    }
    loadState()
  }, [user])

  const unlockEncryption = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!saltRef.current) return false
    try {
      const key = await deriveKey(passphrase, saltRef.current)
      cryptoKeyRef.current = key
      setIsUnlocked(true)
      return true
    } catch {
      return false
    }
  }, [])

  const lockEncryption = useCallback(() => {
    cryptoKeyRef.current = null
    setIsUnlocked(false)
  }, [])

  const enableEncryption = useCallback(async (passphrase: string, onProgress?: (pct: number) => void) => {
    if (!user) return
    const salt = generateSalt()
    const key = await deriveKey(passphrase, salt)
    cryptoKeyRef.current = key
    saltRef.current = salt

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    const existingPrefs = (settingsData?.preferences as Record<string, unknown>) ?? {}
    await supabase
      .from('user_settings')
      .update({
        preferences: {
          ...existingPrefs,
          encryption_enabled: true,
          encryption_salt: saltToBase64(salt),
          file_encryption_enabled: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    const { data: notes } = await supabase
      .from('notes')
      .select('id, content')
      .eq('user_id', user.id)

    if (notes && notes.length > 0) {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i]
        if (note.content && !isEncrypted(note.content)) {
          const encrypted = await encryptContent(note.content, key)
          await supabase.from('notes').update({ content: encrypted }).eq('id', note.id)
        }
        onProgress?.(Math.round(((i + 1) / notes.length) * 100))
      }
    } else {
      onProgress?.(100)
    }

    setIsEnabled(true)
    setIsUnlocked(true)
  }, [user])

  const disableEncryption = useCallback(async (passphrase: string, onProgress?: (pct: number) => void) => {
    if (!user || !saltRef.current) return
    const key = await deriveKey(passphrase, saltRef.current)

    const { data: notes } = await supabase
      .from('notes')
      .select('id, content')
      .eq('user_id', user.id)

    if (notes && notes.length > 0) {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i]
        if (note.content && isEncrypted(note.content)) {
          const decrypted = await decryptContent(note.content, key)
          await supabase.from('notes').update({ content: decrypted }).eq('id', note.id)
        }
        onProgress?.(Math.round(((i + 1) / notes.length) * 100))
      }
    } else {
      onProgress?.(100)
    }

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    const existingPrefs = (settingsData?.preferences as Record<string, unknown>) ?? {}
    const { encryption_enabled: _e, encryption_salt: _s, file_encryption_enabled: _f, ...rest } = existingPrefs
    await supabase
      .from('user_settings')
      .update({
        preferences: rest as Record<string, Json>,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    cryptoKeyRef.current = null
    saltRef.current = null
    setIsEnabled(false)
    setIsUnlocked(false)
  }, [user])

  const encryptString = useCallback(async (plaintext: string): Promise<string> => {
    if (!cryptoKeyRef.current) return plaintext
    return encryptContent(plaintext, cryptoKeyRef.current)
  }, [])

  const decryptString = useCallback(async (ciphertext: string): Promise<string> => {
    if (!cryptoKeyRef.current || !isEncrypted(ciphertext)) return ciphertext
    try {
      return await decryptContent(ciphertext, cryptoKeyRef.current)
    } catch {
      return '[Decryption failed]'
    }
  }, [])

  return (
    <EncryptionContext.Provider value={{
      isEncryptionEnabled: isEnabled,
      isUnlocked,
      unlockEncryption,
      lockEncryption,
      enableEncryption,
      disableEncryption,
      encryptString,
      decryptString,
      fileEncryptionEnabled: isEnabled,
    }}>
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  const ctx = useContext(EncryptionContext)
  if (!ctx) throw new Error('useEncryption must be used within EncryptionProvider')
  return ctx
}
