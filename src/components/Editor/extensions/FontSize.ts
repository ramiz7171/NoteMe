import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ commands }) =>
          commands.setMark('textStyle', { fontSize: size }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.removeEmptyTextStyle(),
    }
  },
})

export const FONT_SIZES = [
  { label: 'Small', value: '0.875em' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '1.25em' },
  { label: 'Huge', value: '1.5em' },
]
