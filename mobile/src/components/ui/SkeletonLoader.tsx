import { useEffect, useRef } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, interpolate } from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme()
  const shimmer = useSharedValue(0)

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }))

  return (
    <Animated.View style={[{
      width: width as any, height, borderRadius,
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
    }, animatedStyle, style]} />
  )
}

export function NoteCardSkeleton() {
  return (
    <View style={{ borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 }}>
      <Skeleton height={14} width="70%" />
      <Skeleton height={10} width="100%" />
      <Skeleton height={10} width="85%" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Skeleton height={10} width={50} />
        <Skeleton height={10} width={70} />
      </View>
    </View>
  )
}

export function ListItemSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8 }}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={10} width="40%" />
      </View>
    </View>
  )
}

export function ScreenSkeleton({ count = 5, variant = 'list' }: { count?: number; variant?: 'card' | 'list' }) {
  const items = Array.from({ length: count })
  return (
    <View style={{ padding: 16 }}>
      {items.map((_, i) => variant === 'card' ? <NoteCardSkeleton key={i} /> : <ListItemSkeleton key={i} />)}
    </View>
  )
}
