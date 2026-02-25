import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { ReactNodeViewProps } from '@tiptap/react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audioNode: {
      setAudio: (options: { src: string }) => ReturnType
    }
  }
}

function AudioNodeView(props: ReactNodeViewProps) {
  const { node, deleteNode } = props
  const { src } = node.attrs as { src: string }

  return (
    <NodeViewWrapper className="audio-wrapper relative group my-2" data-audio="">
      <audio controls preload="metadata" src={src} className="w-full" />
      <button
        onClick={(e) => { e.stopPropagation(); deleteNode() }}
        onMouseDown={(e) => e.preventDefault()}
        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Remove recording"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </NodeViewWrapper>
  )
}

export const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-audio]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-audio': '', class: 'audio-wrapper' }),
      [
        'audio',
        mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata' }),
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView)
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    }
  },
})
