import { useState, useEffect, useCallback } from 'react'
import { isBiometricAvailable, getBiometricType, authenticateWithBiometric } from '../lib/biometric'
import { secureStorage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const BIOMETRIC_ENABLED_KEY = 'criptnote-biometric-enabled'

export function usePasskeys() {
  const { user } = useAuth()
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const available = await isBiometricAvailable()
      setIsAvailable(available)
      if (available) {
        const type = await getBiometricType()
        setBiometricType(type)
      }
      const enabled = await secureStorage.get(BIOMETRIC_ENABLED_KEY)
      setIsEnabled(enabled === 'true')
      setLoading(false)
    }
    init()
  }, [])

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    const success = await authenticateWithBiometric(`Enable ${biometricType} for CriptNote`)
    if (success) {
      await secureStorage.set(BIOMETRIC_ENABLED_KEY, 'true')
      setIsEnabled(true)
      return true
    }
    return false
  }, [biometricType])

  const disableBiometric = useCallback(async () => {
    await secureStorage.remove(BIOMETRIC_ENABLED_KEY)
    setIsEnabled(false)
  }, [])

  const verifyBiometric = useCallback(async (): Promise<boolean> => {
    if (!isEnabled || !isAvailable) return false
    return authenticateWithBiometric()
  }, [isEnabled, isAvailable])

  return {
    isAvailable,
    isEnabled,
    biometricType,
    loading,
    enableBiometric,
    disableBiometric,
    verifyBiometric,
  }
}
