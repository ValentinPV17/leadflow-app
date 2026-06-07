import { useState, useRef, useEffect } from 'react'
import { X, Tag } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (index: number) => void
  placeholder: string
  suggestions?: string[]
}

export default function TagInput({ tags, onAdd, onRemove, placeholder, suggestions }: TagInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = suggestions?.filter(
    s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  ) || []

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) onAdd(input.trim())
      setInput('')
      setShowSuggestions(false)
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      onRemove(tags.length - 1)
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSelect = (s: string) => {
    onAdd(s)
    setInput('')
    setShowSuggestions(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className={`flex flex-wrap gap-1.5 p-2.5 rounded-lg border transition-all duration-200 min-h-[44px] ${
        focused
          ? 'border-emerald-400/60 bg-slate-800/80 shadow-[0_0_0_3px_rgba(52,211,153,0.08)]'
          : 'border-slate-600/50 bg-slate-800/50'
      }`}>
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md text-xs font-medium border border-emerald-500/20 tracking-wide">
            {tag}
            <button onClick={() => onRemove(i)} className="hover:text-white transition-colors ml-0.5">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKey}
          onFocus={() => {
            setFocused(true)
            setShowSuggestions(true)
          }}
          placeholder={tags.length === 0 ? placeholder : '+ Agregar'}
          className="flex-1 min-w-[100px] bg-transparent text-white text-sm outline-none placeholder-slate-500"
        />
      </div>

      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-800 border border-slate-600/50 rounded-lg shadow-2xl shadow-black/40 max-h-36 overflow-y-auto">
          {filtered.slice(0, 6).map((s, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors flex items-center gap-2"
            >
              <Tag size={12} className="text-slate-500" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
