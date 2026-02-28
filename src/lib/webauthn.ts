// CriptNote — WebAuthn / Passkey utilities
// Uses Web Authentication API for biometric/security key unlock

export function isWebAuthnAvailable(): boolean {
  return !!window.PublicKeyCredential
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export interface PasskeyCredentialResult {
  credentialId: string
  publicKey: string
  transports: string[]
}

export async function createPasskeyCredential(
  userId: string,
  userName: string
): Promise<PasskeyCredentialResult | null> {
  if (!isWebAuthnAvailable()) return null

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userIdBytes = new TextEncoder().encode(userId)

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: {
          name: 'CriptNote',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: userName,
          displayName: userName,
        },
        challenge,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },    // ES256
          { type: 'public-key', alg: -257 },   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null

    if (!credential) return null

    const response = credential.response as AuthenticatorAttestationResponse
    const transports = response.getTransports?.() ?? []

    return {
      credentialId: base64urlEncode(credential.rawId),
      publicKey: base64urlEncode(response.attestationObject),
      transports,
    }
  } catch {
    return null
  }
}

export async function verifyPasskeyCredential(
  credentialIds: string[]
): Promise<{ credentialId: string; ok: boolean }> {
  if (!isWebAuthnAvailable() || credentialIds.length === 0) {
    return { credentialId: '', ok: false }
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: credentialIds.map(id => ({
          type: 'public-key' as const,
          id: base64urlDecode(id),
          transports: ['internal' as const],
        })),
        userVerification: 'required',
        timeout: 60000,
        rpId: window.location.hostname,
      },
    }) as PublicKeyCredential | null

    if (!credential) return { credentialId: '', ok: false }

    return {
      credentialId: base64urlEncode(credential.rawId),
      ok: true,
    }
  } catch {
    return { credentialId: '', ok: false }
  }
}
