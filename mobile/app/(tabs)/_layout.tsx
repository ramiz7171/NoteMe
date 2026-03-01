import { Tabs } from 'expo-router'
import { useTheme } from '../../src/context/ThemeContext'
import { useSecurity } from '../../src/context/SecurityContext'
import { AnimatedTabIcon } from '../../src/components/ui/AnimatedTabIcon'
import * as Haptics from 'expo-haptics'

export default function TabLayout() {
  const { colors } = useTheme()
  const { isLocked } = useSecurity()

  if (isLocked) return null

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border, borderTopWidth: 0.5, height: 88, paddingBottom: 28, paddingTop: 8 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}
    screenListeners={{
      tabPress: () => { Haptics.selectionAsync() },
    }}>
      <Tabs.Screen name="(notes)" options={{
        title: 'Notes',
        tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="document-text" size={size} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="(board)" options={{
        title: 'Board',
        tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="brush" size={size} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="(files)" options={{
        title: 'Files',
        tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="folder" size={size} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="(meetings)" options={{
        title: 'Meetings',
        tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="people" size={size} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="(transcripts)" options={{
        title: 'Transcripts',
        tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="mic" size={size} color={color} focused={focused} />,
      }} />
    </Tabs>
  )
}
