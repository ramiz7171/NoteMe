import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export const TAB_COLORS = [
  { key: 'none', label: 'None', value: '' },
  { key: 'red', label: 'Red', value: '#ef4444' },
  { key: 'orange', label: 'Orange', value: '#f97316' },
  { key: 'yellow', label: 'Yellow', value: '#eab308' },
  { key: 'green', label: 'Green', value: '#22c55e' },
  { key: 'blue', label: 'Blue', value: '#3b82f6' },
  { key: 'purple', label: 'Purple', value: '#a855f7' },
  { key: 'pink', label: 'Pink', value: '#ec4899' },
]

export interface Tab {
  id: string
  noteId: string | null
  title: string
  color: string
  group: string
}

interface Props {
  tabs: Tab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
  onReorder: (tabs: Tab[]) => void
  onUpdateTab: (tabId: string, updates: Partial<Pick<Tab, 'color' | 'group'>>) => void
  onRenameTab: (tabId: string, title: string) => void
  groups: string[]
  groupColors: Record<string, string>
  onUpdateGroupColor: (group: string, color: string) => void
  onRenameGroup: (oldName: string, newName: string) => void
}

interface ContextMenu {
  x: number
  y: number
  tabId: string
}

interface DropTarget {
  type: 'tab' | 'group-zone' | 'ungrouped-zone'
  tabId?: string
  group?: string
}

function getTabColorStyle(color: string, isActive: boolean): React.CSSProperties {
  if (!color) return {}
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const opacity = isActive ? 0.20 : 0.12
  const style: React.CSSProperties = {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    borderTop: `2px solid ${color}`,
  }
  if (isActive) {
    style.backdropFilter = 'blur(12px)'
    style.WebkitBackdropFilter = 'blur(12px)'
  }
  return style
}

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab, onReorder, onUpdateTab, onRenameTab, groups, groupColors, onUpdateGroupColor, onRenameGroup }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [dragOverZone, setDragOverZone] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [groupContextMenu, setGroupContextMenu] = useState<{ x: number; y: number; group: string } | null>(null)
  const [showGroupColorPicker, setShowGroupColorPicker] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [editGroupNameValue, setEditGroupNameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const groupMenuRef = useRef<HTMLDivElement>(null)
  const dragTabId = useRef<string | null>(null)
  const dropTarget = useRef<DropTarget | null>(null)
  const transparentImg = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
        setShowColorPicker(false)
        setShowGroupPicker(false)
      }
    }
    if (contextMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // Close group context menu on outside click
  useEffect(() => {
    if (!groupContextMenu) return
    const handler = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setGroupContextMenu(null)
        setShowGroupColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [groupContextMenu])

  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const handleGroupContextMenu = (e: React.MouseEvent, group: string) => {
    e.preventDefault()
    e.stopPropagation()
    setGroupContextMenu({ x: e.clientX, y: e.clientY, group })
    setShowGroupColorPicker(false)
  }

  const handleGroupRename = (oldName: string) => {
    const trimmed = editGroupNameValue.trim()
    if (trimmed && trimmed !== oldName) {
      onRenameGroup(oldName, trimmed)
    }
    setEditingGroupName(null)
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, tabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({ x: rect.left, y: rect.bottom + 4, tabId })
    setShowColorPicker(false)
    setShowGroupPicker(false)
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      onCloseTab(tabId)
    }
  }

  // --- Drag and Drop ---

  // Create transparent 1x1 image once for hiding default drag ghost
  useEffect(() => {
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    transparentImg.current = img
  }, [])

  // Track cursor position during drag for custom ghost
  useEffect(() => {
    if (!draggingTabId) return
    const handler = (e: DragEvent) => {
      setGhostPos({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('dragover', handler)
    return () => document.removeEventListener('dragover', handler)
  }, [draggingTabId])

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    dragTabId.current = tabId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tabId)
    // Hide default browser drag ghost
    if (transparentImg.current) {
      e.dataTransfer.setDragImage(transparentImg.current, 0, 0)
    }
    setIsDragging(true)
    setDraggingTabId(tabId)
    setGhostPos({ x: e.clientX, y: e.clientY })
  }

  const handleDragEnd = () => {
    dragTabId.current = null
    dropTarget.current = null
    setDragOverZone(null)
    setIsDragging(false)
    setDraggingTabId(null)
    setGhostPos(null)
  }

  const handleTabDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragTabId.current === tabId) return
    // Detect left/right half of the tab
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
    dropTarget.current = { type: 'tab', tabId }
    const key = `tab:${tabId}:${side}`
    setDragOverZone(prev => prev === key ? prev : key)
  }

  const handleZoneDragOver = useCallback((e: React.DragEvent, zone: DropTarget) => {
    e.preventDefault()
    dropTarget.current = zone
    const key = zone.type === 'group-zone' ? `group:${zone.group}` : 'ungrouped'
    setDragOverZone(prev => prev === key ? prev : key)
  }, [])

  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    const container = e.currentTarget
    if (!container.contains(e.relatedTarget as Node)) {
      setDragOverZone(null)
      dropTarget.current = null
    }
  }, [])

  const handleDrop = useCallback(() => {
    const dragId = dragTabId.current
    const target = dropTarget.current
    const zone = dragOverZone
    if (!dragId || !target) return

    if (target.type === 'tab') {
      const fromIdx = tabs.findIndex(t => t.id === dragId)
      const toIdx = tabs.findIndex(t => t.id === target.tabId)
      if (fromIdx === -1 || toIdx === -1) return
      const reordered = [...tabs]
      const [moved] = reordered.splice(fromIdx, 1)
      moved.group = tabs[toIdx].group // adopt target's group
      const insertIdx = reordered.findIndex(t => t.id === target.tabId)
      // Insert after if dropping on right side
      const isRight = zone?.endsWith(':right')
      reordered.splice(isRight ? insertIdx + 1 : insertIdx, 0, moved)
      onReorder(reordered)
    } else if (target.type === 'group-zone') {
      const tab = tabs.find(t => t.id === dragId)
      if (!tab || tab.group === target.group) return
      const reordered = tabs.filter(t => t.id !== dragId)
      const lastIdx = reordered.reduce((acc, t, i) => t.group === target.group ? i : acc, -1)
      reordered.splice(lastIdx + 1, 0, { ...tab, group: target.group! })
      onReorder(reordered)
    } else if (target.type === 'ungrouped-zone') {
      const tab = tabs.find(t => t.id === dragId)
      if (!tab || !tab.group) return
      const reordered = tabs.filter(t => t.id !== dragId)
      const lastIdx = reordered.reduce((acc, t, i) => !t.group ? i : acc, -1)
      reordered.splice(lastIdx + 1, 0, { ...tab, group: '' })
      onReorder(reordered)
    }

    dragTabId.current = null
    dropTarget.current = null
    setDragOverZone(null)
    setIsDragging(false)
    setDraggingTabId(null)
  }, [tabs, onReorder, dragOverZone])

  // --- Data ---

  const ungrouped = tabs.filter(t => !t.group)
  const groupedMap = new Map<string, Tab[]>()
  for (const t of tabs) {
    if (t.group) {
      if (!groupedMap.has(t.group)) groupedMap.set(t.group, [])
      groupedMap.get(t.group)!.push(t)
    }
  }

  const contextTab = contextMenu ? tabs.find(t => t.id === contextMenu.tabId) : null

  const renderTab = (tab: Tab) => {
    const isActive = activeTabId === tab.id
    const hasColor = !!tab.color
    const isBeingDragged = draggingTabId === tab.id
    const dropLeft = dragOverZone === `tab:${tab.id}:left`
    const dropRight = dragOverZone === `tab:${tab.id}:right`
    const colorStyle = getTabColorStyle(tab.color, isActive)

    return (
      <div
        key={tab.id}
        draggable
        onDragStart={e => handleDragStart(e, tab.id)}
        onDragEnd={handleDragEnd}
        onDragOver={e => handleTabDragOver(e, tab.id)}
        onDrop={handleDrop}
        onMouseDown={e => handleMiddleClick(e, tab.id)}
        onContextMenu={e => handleContextMenu(e, tab.id)}
        onClick={() => onSelectTab(tab.id)}
        className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer min-w-[100px] max-w-[200px] transition-all duration-150 relative select-none rounded-t-xl ${
          isActive && !hasColor ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : ''
        }${
          isActive && hasColor ? 'text-gray-900 dark:text-white shadow-sm' : ''
        }${
          !isActive ? 'bg-gray-200/50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400' : ''
        }${
          !isActive && !hasColor ? ' hover:bg-gray-200/80 dark:hover:bg-white/8' : ''
        }${
          isBeingDragged ? ' opacity-40 scale-95' : ''
        }`}
        style={colorStyle}
      >
        {/* Drop indicator lines */}
        {dropLeft && (
          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[var(--accent)] rounded-full z-10" />
        )}
        {dropRight && (
          <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-[var(--accent)] rounded-full z-10" />
        )}
        {hasColor && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />
        )}

        {editingTabId === tab.id ? (
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={() => {
              const trimmed = editTitle.trim()
              if (trimmed && trimmed !== tab.title) onRenameTab(tab.id, trimmed)
              setEditingTabId(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const trimmed = editTitle.trim()
                if (trimmed && trimmed !== tab.title) onRenameTab(tab.id, trimmed)
                setEditingTabId(null)
              }
              if (e.key === 'Escape') setEditingTabId(null)
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none border-b border-[var(--accent)]"
          />
        ) : (
          <span
            className="truncate flex-1"
            onDoubleClick={e => {
              e.stopPropagation()
              setEditTitle(tab.title)
              setEditingTabId(tab.id)
            }}
          >
            {tab.title || 'New Note'}
          </span>
        )}

        <button
          onClick={e => { e.stopPropagation(); onCloseTab(tab.id) }}
          className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-gray-200/80 dark:border-white/5 bg-gray-100/60 dark:bg-white/[0.02] shrink-0">
      <div className="flex items-center overflow-x-auto min-h-[32px]">
        {tabs.length === 0 ? (
          <button
            onClick={onNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors rounded-t-xl cursor-pointer"
          >
            New Note
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        ) : (
          <>
            {/* Ungrouped drop zone */}
            <div
              className={`flex items-center min-h-[32px] transition-all duration-150 ${
                isDragging && dragOverZone === 'ungrouped'
                  ? 'bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-blue-300/50 dark:ring-blue-500/20 rounded-lg mx-0.5'
                  : ''
              }`}
              onDragOver={e => handleZoneDragOver(e, { type: 'ungrouped-zone' })}
              onDragLeave={handleZoneDragLeave}
              onDrop={handleDrop}
            >
              {ungrouped.map(renderTab)}
              {ungrouped.length === 0 && isDragging && (
                <div className="px-4 py-1 text-[10px] text-gray-400 dark:text-gray-500 italic whitespace-nowrap">
                  Drop to ungroup
                </div>
              )}
            </div>

            {/* Group drop zones */}
            {[...groupedMap.entries()].map(([group, groupTabs]) => {
              const isCollapsed = collapsedGroups.has(group)
              const gColor = groupColors[group] || ''
              const groupBorderColor = gColor || undefined
              const groupBgStyle: React.CSSProperties = gColor ? {
                backgroundColor: `${gColor}15`,
                borderLeftColor: gColor,
              } : {}

              return (
                <div
                  key={group}
                  className={`flex items-center transition-all duration-150 ${
                    isDragging && dragOverZone === `group:${group}`
                      ? 'bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-blue-300/50 dark:ring-blue-500/20 rounded-lg mx-0.5'
                      : ''
                  }`}
                  onDragOver={e => handleZoneDragOver(e, { type: 'group-zone', group })}
                  onDragLeave={handleZoneDragLeave}
                  onDrop={handleDrop}
                >
                  <div
                    className="flex items-center gap-1 px-2 py-1 border-l-2 cursor-pointer select-none"
                    style={{
                      borderLeftColor: groupBorderColor || 'rgba(156,163,175,0.5)',
                      ...groupBgStyle,
                    }}
                    onClick={() => toggleGroupCollapse(group)}
                    onContextMenu={e => handleGroupContextMenu(e, group)}
                  >
                    {editingGroupName === group ? (
                      <input
                        type="text"
                        value={editGroupNameValue}
                        onChange={e => setEditGroupNameValue(e.target.value)}
                        onBlur={() => handleGroupRename(group)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleGroupRename(group)
                          if (e.key === 'Escape') setEditingGroupName(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        className="w-16 text-[10px] font-semibold uppercase tracking-wider bg-transparent focus:outline-none border-b border-[var(--accent)] text-gray-600 dark:text-gray-300"
                      />
                    ) : (
                      <span
                        className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        onDoubleClick={e => {
                          e.stopPropagation()
                          setEditGroupNameValue(group)
                          setEditingGroupName(group)
                        }}
                      >
                        {group}
                      </span>
                    )}
                    {isCollapsed && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium ml-0.5">
                        {groupTabs.length}
                      </span>
                    )}
                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {!isCollapsed && groupTabs.map(renderTab)}
                </div>
              )
            })}

            {/* + button after last tab */}
            <button
              onClick={onNewTab}
              className="shrink-0 p-1.5 ml-0.5 text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors rounded-lg"
              title="New note"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Floating drag ghost */}
      {draggingTabId && ghostPos && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-white dark:bg-neutral-800 shadow-lg shadow-black/20 border border-gray-200/50 dark:border-white/10 opacity-90 scale-105"
          style={{ left: ghostPos.x + 12, top: ghostPos.y - 16 }}
        >
          {(() => {
            const tab = tabs.find(t => t.id === draggingTabId)
            if (!tab) return null
            return (
              <>
                {tab.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />}
                <span className="truncate max-w-[160px]">{tab.title || 'New Note'}</span>
              </>
            )
          })()}
        </div>,
        document.body
      )}

      {/* Group context menu */}
      {groupContextMenu && createPortal(
        <div
          ref={groupMenuRef}
          className="fixed z-50 glass-panel rounded-xl shadow-xl py-1 min-w-[160px] animate-[scaleIn_0.1s_ease-out]"
          style={{
            left: Math.min(groupContextMenu.x, window.innerWidth - 180),
            top: groupContextMenu.y,
          }}
        >
          <button
            onClick={() => {
              setEditGroupNameValue(groupContextMenu.group)
              setEditingGroupName(groupContextMenu.group)
              setGroupContextMenu(null)
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10"
          >
            Rename Group
          </button>

          <div className="relative">
            <button
              onClick={() => setShowGroupColorPicker(!showGroupColorPicker)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center justify-between"
            >
              <span>Group Color</span>
              {groupColors[groupContextMenu.group] && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: groupColors[groupContextMenu.group] }} />
              )}
            </button>
            {showGroupColorPicker && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5">
                {TAB_COLORS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => {
                      onUpdateGroupColor(groupContextMenu.group, c.value)
                      setGroupContextMenu(null)
                      setShowGroupColorPicker(false)
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                      groupColors[groupContextMenu.group] === c.value ? 'border-gray-900 dark:border-white' : 'border-gray-200/50 dark:border-white/20'
                    }`}
                    style={{ backgroundColor: c.value || '#d1d5db' }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Context Menu (portal to body to escape backdrop-filter containing block) */}
      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 glass-panel rounded-xl shadow-xl py-1 min-w-[180px] animate-[scaleIn_0.1s_ease-out]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => { onCloseTab(contextMenu.tabId); setContextMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10"
          >
            Close Tab
          </button>

          <div className="border-t border-gray-100 dark:border-white/10 my-1" />

          <div className="relative">
            <button
              onClick={() => { setShowColorPicker(!showColorPicker); setShowGroupPicker(false) }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center justify-between"
            >
              <span>Set Color</span>
              {contextTab?.color && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: contextTab.color }} />
              )}
            </button>
            {showColorPicker && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5">
                {TAB_COLORS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => {
                      onUpdateTab(contextMenu.tabId, { color: c.value })
                      setContextMenu(null)
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                      contextTab?.color === c.value ? 'border-gray-900 dark:border-white' : 'border-gray-200/50 dark:border-white/20'
                    }`}
                    style={{ backgroundColor: c.value || '#d1d5db' }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowGroupPicker(!showGroupPicker); setShowColorPicker(false) }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10 flex items-center justify-between"
            >
              <span>Group</span>
              {contextTab?.group && (
                <span className="text-xs text-gray-400">{contextTab.group}</span>
              )}
            </button>
            {showGroupPicker && (
              <div className="px-2 py-1.5 space-y-1">
                {contextTab?.group && (
                  <button
                    onClick={() => {
                      onUpdateTab(contextMenu.tabId, { group: '' })
                      setContextMenu(null)
                    }}
                    className="w-full text-left px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                  >
                    Remove from group
                  </button>
                )}
                {groups.map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      onUpdateTab(contextMenu.tabId, { group: g })
                      setContextMenu(null)
                    }}
                    className={`w-full text-left px-2 py-1 text-xs rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/10 ${
                      contextTab?.group === g ? 'text-[var(--accent)] font-medium' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="New group..."
                    className="flex-1 px-2 py-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newGroupName.trim()) {
                        onUpdateTab(contextMenu.tabId, { group: newGroupName.trim() })
                        setNewGroupName('')
                        setContextMenu(null)
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newGroupName.trim()) {
                        onUpdateTab(contextMenu.tabId, { group: newGroupName.trim() })
                        setNewGroupName('')
                        setContextMenu(null)
                      }
                    }}
                    className="px-2 py-1 text-xs bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
