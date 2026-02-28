// CriptNote — Web Crypto API utilities
// AES-GCM 256-bit encryption, PBKDF2 key derivation, SHA-256 hashing

const PBKDF2_ITERATIONS = 100_000
const AES_KEY_LENGTH = 256
const IV_LENGTH = 12 // bytes
const SALT_LENGTH = 16 // bytes
const ENCRYPTED_PREFIX = 'enc:'

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptContent(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  // Concatenate IV + ciphertext, then base64-encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return ENCRYPTED_PREFIX + uint8ToBase64(combined)
}

export async function decryptContent(encrypted: string, key: CryptoKey): Promise<string> {
  if (!isEncrypted(encrypted)) return encrypted
  const combined = base64ToUint8(encrypted.slice(ENCRYPTED_PREFIX.length))
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}

export function isEncrypted(content: string): boolean {
  return content.startsWith(ENCRYPTED_PREFIX)
}

export async function encryptFile(file: File, key: CryptoKey): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return new Blob([combined], { type: 'application/octet-stream' })
}

export async function decryptFile(encryptedBlob: Blob, key: CryptoKey, mimeType: string): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer()
  const combined = new Uint8Array(arrayBuffer)
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new Blob([plaintext], { type: mimeType })
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(pin))
  return uint8ToBase64(new Uint8Array(hash))
}

// ── Base64 helpers ──

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
