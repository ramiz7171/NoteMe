import * as LocalAuthentication from 'expo-local-authentication'
import * as Device from 'expo-device'

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  const isEnrolled = await LocalAuthentication.isEnrolledAsync()
  return hasHardware && isEnrolled
}

export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris'
  }
  return 'Biometric'
}

export async function authenticateWithBiometric(promptMessage?: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || 'Unlock CriptNote',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use PIN',
  })
  return result.success
}

export function getDeviceName(): string {
  const brand = Device.brand || ''
  const model = Device.modelName || ''
  const os = Device.osName || ''

  if (os === 'iOS' || os === 'iPadOS') {
    return model || 'iPhone'
  }
  if (os === 'Android') {
    return `${brand} ${model}`.trim() || 'Android Device'
  }
  return `${os} Device`
}

export function getDeviceInfo(): string {
  const parts = [
    Device.brand,
    Device.modelName,
    Device.osName,
    Device.osVersion,
  ].filter(Boolean)
  return parts.join(' ') || 'Unknown Device'
}
