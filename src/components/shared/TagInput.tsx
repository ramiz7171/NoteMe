import { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
        placeholder={placeholder}
        className="flex-1 min-w-[80px] text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
      />
    </div>
  )
}
