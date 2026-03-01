import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Secure storage for secrets (PIN hash, encryption salt)
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value)
  },
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key)
  },
}

// Regular storage for non-sensitive data (theme, usage counters)
export const appStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value)
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  },
}
