import { useEffect, useRef, useState } from 'react'

interface PublicAssistantPetBubbleProps {
  text: string
  openLabel: string
  onOpen: () => void
  onDismiss: () => void
}

/** Mounted once per task event; opening the panel never recreates an old hint. */
export function PublicAssistantPetBubble({ text, openLabel, onOpen, onDismiss }: PublicAssistantPetBubbleProps) {
  const [expired, setExpired] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(6_000)
  useEffect(() => {
    if (expired || hovered || focused) return
    const started = performance.now()
    const timer = window.setTimeout(() => setExpired(true), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (performance.now() - started))
    }
  }, [expired, focused, hovered])
  if (expired) return null
  return <button type="button" className="public-assistant__bubble" aria-label={`${text} · ${openLabel}`}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={onOpen}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setExpired(true); onDismiss() } }}>
    <span role="status">{text}</span>
  </button>
}
