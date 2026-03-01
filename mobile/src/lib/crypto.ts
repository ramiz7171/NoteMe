import QuickCrypto from 'react-native-quick-crypto'

const PBKDF2_ITERATIONS = 100_000
const AES_KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16
const ENCRYPTED_PREFIX = 'enc:'

type AnyKey = any

export function generateSalt(): Uint8Array {
  return new Uint8Array(QuickCrypto.getRandomValues(new Uint8Array(SALT_LENGTH)))
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<AnyKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await (QuickCrypto.subtle as any).importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return (QuickCrypto.subtle as any).deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptContent(plaintext: string, key: AnyKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = new Uint8Array(QuickCrypto.getRandomValues(new Uint8Array(IV_LENGTH)))
  const ciphertext = await QuickCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return ENCRYPTED_PREFIX + uint8ToBase64(combined)
}

export async function decryptContent(encrypted: string, key: AnyKey): Promise<string> {
  if (!isEncrypted(encrypted)) return encrypted
  const combined = base64ToUint8(encrypted.slice(ENCRYPTED_PREFIX.length))
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  const plaintext = await QuickCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}

export function isEncrypted(content: string): boolean {
  return content.startsWith(ENCRYPTED_PREFIX)
}

export async function encryptFileData(data: ArrayBuffer, key: AnyKey): Promise<Uint8Array> {
  const iv = new Uint8Array(QuickCrypto.getRandomValues(new Uint8Array(IV_LENGTH)))
  const ciphertext = await QuickCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return combined
}

export async function decryptFileData(data: ArrayBuffer, key: AnyKey): Promise<ArrayBuffer> {
  const combined = new Uint8Array(data)
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  return QuickCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await QuickCrypto.subtle.digest('SHA-256', encoder.encode(pin))
  return uint8ToBase64(new Uint8Array(hash))
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function saltToBase64(salt: Uint8Array): string {
  return uint8ToBase64(salt)
}

export function base64ToSalt(b64: string): Uint8Array {
  return base64ToUint8(b64)
}
