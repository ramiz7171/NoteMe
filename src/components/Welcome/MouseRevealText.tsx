import { useRef, useEffect, useState, useCallback } from 'react'

interface MouseRevealTextProps {
  text: string
  className?: string
  revealSize?: number
  moveThreshold?: number
  magnifyRadius?: number
  magnifyScale?: number
}

export default function MouseRevealText({
  text,
  className = '',
  revealSize = 200,
  moveThreshold = 8,
  magnifyRadius = 120,
  magnifyScale = 1.5,
}: MouseRevealTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [revealed, setRevealed] = useState(false)
  const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 })
  const moveCountRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const mousePosRef = useRef({ x: -9999, y: -9999 })

  const updateChars = useCallback(() => {
    const mx = mousePosRef.current.x
    const my = mousePosRef.current.y

    for (const span of charRefs.current) {
      if (!span) continue
      const rect = span.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)

      if (dist < magnifyRadius) {
        const t = 1 - dist / magnifyRadius
        const s = 1 + (magnifyScale - 1) * t * t
        span.style.transform = `scale(${s})`
        span.style.opacity = '1'
      } else {
        span.style.transform = 'scale(1)'
      }
    }
    rafRef.current = null
  }, [magnifyRadius, magnifyScale])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top

      if (!revealed) {
        setMousePos({ x: localX, y: localY })
        moveCountRef.current++
        if (moveCountRef.current >= moveThreshold) {
          setRevealed(true)
        }
      }

      mousePosRef.current = { x: e.clientX, y: e.clientY }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateChars)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [revealed, moveThreshold, updateChars])

  const maskStyle: React.CSSProperties = revealed
    ? {}
    : {
        WebkitMaskImage: `radial-gradient(circle ${revealSize}px at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
        maskImage: `radial-gradient(circle ${revealSize}px at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
      }

  return (
    <div ref={containerRef} className="relative inline-block">
      <p
        className={`${className} transition-all ${revealed ? 'duration-[1.5s] ease-out' : 'duration-100'}`}
        style={{
          opacity: revealed ? 1 : mousePos.x === -9999 ? 0 : 1,
          ...maskStyle,
        }}
      >
        {text.split('').map((char, i) => (
          <span
            key={i}
            ref={el => { charRefs.current[i] = el }}
            className="inline-block transition-transform duration-150 ease-out"
            style={{ willChange: 'transform' }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </p>
    </div>
  )
}
