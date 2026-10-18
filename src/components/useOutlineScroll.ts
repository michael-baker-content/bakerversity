'use client'

import { useLayoutEffect, useRef } from 'react'

// Fall back to this tab's memory when browser storage is unavailable.
const positions = new Map<string, number>()

export function useOutlineScroll(courseSlug: string, view: 'desktop' | 'mobile', visible = true) {
  const ref = useRef<HTMLDivElement>(null)
  const key = `bakerversity:outline:${encodeURIComponent(courseSlug)}:${view}`

  function remember() {
    const element = ref.current
    if (!element || !element.clientHeight) return
    positions.set(key, element.scrollTop)
    try { sessionStorage.setItem(key, String(element.scrollTop)) } catch { /* Storage may be disabled. */ }
  }

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !visible) return
    function restore() {
      if (!element || !element.clientHeight) return
      let position = positions.get(key)
      if (position === undefined) {
        try {
          const stored = sessionStorage.getItem(key)
          if (stored !== null && Number.isFinite(Number(stored))) position = Math.max(0, Number(stored))
        } catch { /* Use the in-memory fallback. */ }
      }
      if (position !== undefined) element.scrollTop = position
    }
    restore()
    // Also restore when a responsive sidebar becomes visible after resizing.
    const observer = new ResizeObserver(restore)
    observer.observe(element)
    return () => observer.disconnect()
  }, [key, visible])

  return { ref, remember }
}
