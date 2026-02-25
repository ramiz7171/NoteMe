import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { useState, useRef, useCallback, useEffect } from 'react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType
    }
  }
}

// -- Node View Component --
function ResizableImageView(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected, editor, getPos, deleteNode } = props
  const { src, alt, title, width, textAlign } = node.attrs as { src: string; alt: string; title: string; width: number | null; textAlign: string | null }
  const [resizing, setResizing] = useState(false)
  const [inSelection, setInSelection] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const imgRef = useRef<HTMLImageElement>(null)

  // Track whether the node is part of a broader selection (e.g. Ctrl+A)
  useEffect(() => {
    const checkSelection = () => {
      const { from, to } = editor.state.selection
      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos != null) {
        setInSelection(from < pos && to > pos + 1)
      }
    }
    editor.on('selectionUpdate', checkSelection)
    checkSelection()
    return () => { editor.off('selectionUpdate', checkSelection) }
  }, [editor, getPos])

  const isHighlighted = selected || inSelection

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    startX.current = e.clientX
    startWidth.current = imgRef.current?.offsetWidth || 300
  }, [])

  useEffect(() => {
    if (!resizing) return
    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current
      const newWidth = Math.max(100, startWidth.current + diff)
      if (imgRef.current) {
        imgRef.current.style.width = `${newWidth}px`
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      setResizing(false)
      const diff = e.clientX - startX.current
      const finalWidth = Math.max(100, startWidth.current + diff)
      updateAttributes({ width: finalWidth })
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [resizing, updateAttributes])

  const setAlign = (align: string) => {
    updateAttributes({ textAlign: align })
  }

  return (
    <NodeViewWrapper className="resizable-image-wrapper" data-drag-handle style={{ textAlign: textAlign || undefined }}>
      <div className="relative inline-block group" style={{ width: width ? `${width}px` : undefined }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{ width: width ? `${width}px` : '100%', height: 'auto' }}
          className={`rounded-lg ${isHighlighted ? 'ring-2 ring-[var(--accent)] ring-offset-2' : ''}`}
          draggable={false}
        />

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode() }}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Remove image"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Alignment buttons */}
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/60 rounded-lg px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button onClick={() => setAlign('left')} className={`p-1 rounded ${textAlign === 'left' ? 'bg-white/30' : 'hover:bg-white/20'}`} title="Align Left">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>
          </button>
          <button onClick={() => setAlign('center')} className={`p-1 rounded ${textAlign === 'center' ? 'bg-white/30' : 'hover:bg-white/20'}`} title="Align Center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
          </button>
          <button onClick={() => setAlign('right')} className={`p-1 rounded ${textAlign === 'right' ? 'bg-white/30' : 'hover:bg-white/20'}`} title="Align Right">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>
          </button>
        </div>

        {/* Resize handles */}
        {isHighlighted && (
          <>
            <div onMouseDown={onResizeMouseDown} className="resize-handle resize-handle-tl" />
            <div onMouseDown={onResizeMouseDown} className="resize-handle resize-handle-tr" />
            <div onMouseDown={onResizeMouseDown} className="resize-handle resize-handle-bl" />
            <div onMouseDown={onResizeMouseDown} className="resize-handle resize-handle-br" />
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// -- Tiptap Node Extension --
export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const w = element.getAttribute('width')
          if (w) return parseInt(w, 10)
          const style = element.getAttribute('style') || ''
          const match = style.match(/width:\s*(\d+)px/)
          if (match) return parseInt(match[1], 10)
          return null
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width: ${attributes.width}px` }
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || element.style.textAlign || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.textAlign) return {}
          return { 'data-align': attributes.textAlign, style: `text-align: ${attributes.textAlign}` }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    }
  },
})
