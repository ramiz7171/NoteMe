import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, Dimensions, Alert, Share } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/context/ThemeContext'
import { useNotes } from '../../../src/hooks/useNotes'
import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import getStroke from 'perfect-freehand'
import { getSvgPathFromStroke, getStrokeOptions, type StrokeData } from '@shared/lib/drawUtils'
import * as Haptics from 'expo-haptics'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

const { width: W, height: H } = Dimensions.get('window')
const COLORS = ['#000000', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#92400e', '#ffffff']
const SIZES: { label: string; value: number }[] = [
  { label: 'S', value: 2 },
  { label: 'M', value: 4 },
  { label: 'L', value: 8 },
  { label: 'XL', value: 16 },
]
type Tool = 'pen' | 'marker' | 'highlighter' | 'eraser'

export default function BoardCanvas() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>()
  const { colors } = useTheme()
  const { notes, updateNote } = useNotes()
  const router = useRouter()
  const canvasRef = useCanvasRef()
  const note = notes.find(n => n.id === boardId)

  const [strokes, setStrokes] = useState<StrokeData[]>([])
  const [redoStack, setRedoStack] = useState<StrokeData[]>([])
  const [currentPoints, setCurrentPoints] = useState<[number, number, number][]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState(note?.title || 'Board')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note?.content) {
      try { setStrokes(JSON.parse(note.content)) } catch { setStrokes([]) }
    }
    if (note?.title) setTitleText(note.title)
  }, [note?.id])

  const saveStrokes = useCallback((s: StrokeData[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (boardId) updateNote(boardId, { content: JSON.stringify(s) })
    }, 500)
  }, [boardId, updateNote])

  const gesture = Gesture.Pan()
    .onStart((e) => { setCurrentPoints([[e.x, e.y, 0.5]]) })
    .onUpdate((e) => { setCurrentPoints(prev => [...prev, [e.x, e.y, 0.5]]) })
    .onEnd(() => {
      if (currentPoints.length > 0) {
        const opacity = tool === 'highlighter' ? 0.3 : 1
        const newStroke: StrokeData = { points: currentPoints, color: tool === 'eraser' ? '#ffffff' : color, size: brushSize, tool, opacity }
        const updated = [...strokes, newStroke]
        setStrokes(updated)
        setRedoStack([])
        saveStrokes(updated)
        setCurrentPoints([])
      }
    })
    .minDistance(0)

  const handleUndo = () => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    const updated = strokes.slice(0, -1)
    setStrokes(updated)
    setRedoStack(prev => [...prev, last])
    saveStrokes(updated)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const last = redoStack[redoStack.length - 1]
    const updated = [...strokes, last]
    setStrokes(updated)
    setRedoStack(prev => prev.slice(0, -1))
    saveStrokes(updated)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleClear = () => {
    if (strokes.length === 0) return
    Alert.alert('Clear Board', 'This will remove all strokes. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        setStrokes([])
        setRedoStack([])
        saveStrokes([])
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }},
    ])
  }

  const handleExport = async () => {
    if (strokes.length === 0) { Alert.alert('Empty', 'Nothing to export.'); return }
    try {
      const image = canvasRef.current?.makeImageSnapshot()
      if (!image) return
      const bytes = image.encodeToBase64()
      const filename = `${titleText.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.png`
      const path = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.writeAsStringAsync(path, bytes, { encoding: FileSystem.EncodingType.Base64 })
      await Sharing.shareAsync(path, { mimeType: 'image/png' })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Error', 'Export failed.')
    }
  }

  const handleTitleSave = () => {
    setEditingTitle(false)
    if (boardId && titleText.trim()) {
      updateNote(boardId, { title: titleText.trim() })
    }
  }

  const selectTool = (t: Tool) => { setTool(t); Haptics.selectionAsync() }

  const renderStroke = (s: StrokeData, i: number) => {
    const opts = getStrokeOptions(s.tool, s.size)
    const outlinePoints = getStroke(s.points, opts)
    const path = getSvgPathFromStroke(outlinePoints)
    if (!path) return null
    const strokeColor = s.tool === 'eraser' ? '#ffffff' : s.color
    return <Path key={i} path={path} color={strokeColor} style="fill" opacity={s.opacity} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        {editingTitle ? (
          <TextInput value={titleText} onChangeText={setTitleText} onBlur={handleTitleSave} onSubmitEditing={handleTitleSave}
            autoFocus style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', flex: 1, marginHorizontal: 12, padding: 4, borderBottomWidth: 1, borderBottomColor: colors.accent }} />
        ) : (
          <TouchableOpacity onPress={() => setEditingTitle(true)} style={{ flex: 1, marginHorizontal: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{titleText}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={handleUndo} disabled={strokes.length === 0}>
            <Ionicons name="arrow-undo" size={22} color={strokes.length === 0 ? colors.border : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRedo} disabled={redoStack.length === 0}>
            <Ionicons name="arrow-redo" size={22} color={redoStack.length === 0 ? colors.border : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} disabled={strokes.length === 0}>
            <Ionicons name="share-outline" size={22} color={strokes.length === 0 ? colors.border : colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} disabled={strokes.length === 0}>
            <Ionicons name="trash-outline" size={22} color={strokes.length === 0 ? colors.border : colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <GestureDetector gesture={gesture}>
        <Canvas ref={canvasRef} style={{ flex: 1 }}>
          {strokes.map(renderStroke)}
          {currentPoints.length > 1 && (() => {
            const opacity = tool === 'highlighter' ? 0.3 : tool === 'eraser' ? 0.25 : 1
            const drawColor = tool === 'eraser' ? '#ff0000' : color
            const opts = getStrokeOptions(tool, brushSize)
            const outlinePoints = getStroke(currentPoints, opts)
            const path = getSvgPathFromStroke(outlinePoints)
            return path ? <Path path={path} color={drawColor} style="fill" opacity={opacity} /> : null
          })()}
        </Canvas>
      </GestureDetector>

      {/* Toolbar */}
      <View style={{ padding: 12, backgroundColor: colors.headerBg, borderTopWidth: 0.5, borderTopColor: colors.border }}>
        {/* Tool row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <ToolButton icon="pencil" label="Pen" active={tool === 'pen'} onPress={() => selectTool('pen')} colors={colors} />
          <ToolButton icon="brush" label="Marker" active={tool === 'marker'} onPress={() => selectTool('marker')} colors={colors} />
          <ToolButton icon="color-wand-outline" label="Highlight" active={tool === 'highlighter'} onPress={() => selectTool('highlighter')} colors={colors} />
          <ToolButton icon="bandage-outline" label="Eraser" active={tool === 'eraser'} onPress={() => selectTool('eraser')} colors={colors} />
          <View style={{ width: 1, height: 30, backgroundColor: colors.border, alignSelf: 'center', marginHorizontal: 4 }} />
          {SIZES.map(s => (
            <TouchableOpacity key={s.label} onPress={() => { setBrushSize(s.value); Haptics.selectionAsync() }}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: brushSize === s.value ? colors.accent : colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: brushSize === s.value ? '#fff' : colors.textSecondary }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Color row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => { setColor(c); Haptics.selectionAsync() }}
              style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c,
                borderWidth: color === c ? 3 : 1, borderColor: color === c ? colors.accent : colors.border }} />
          ))}
        </View>
      </View>
    </View>
  )
}

function ToolButton({ icon, label, active, onPress, colors }: {
  icon: string; label: string; active: boolean; onPress: () => void; colors: any
}) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ alignItems: 'center', padding: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: active ? colors.accent : colors.surfaceSecondary }}>
      <Ionicons name={icon as any} size={18} color={active ? '#fff' : colors.text} />
      <Text style={{ fontSize: 9, color: active ? '#fff' : colors.textSecondary, marginTop: 1 }}>{label}</Text>
    </TouchableOpacity>
  )
}
