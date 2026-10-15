'use client'
import { useEffect } from 'react'

export const discardMessage = 'You have unsaved or unconfirmed changes. Leave this editor and discard the local copy?'

/** Protect document exits and in-app links without replacing Next's router/history. */
export function useUnsavedChanges(protect: boolean) {
  useEffect(() => {
    if (!protect) return
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = '' }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element)?.closest?.('a')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const next = new URL(anchor.href, location.href)
      if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return
      if (!window.confirm(discardMessage)) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    // Chromium's Navigation API can cancel same-document Back/Forward traversals.
    // Browsers without this API still receive link and document-unload protection.
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation
    function traverse(event: Event) {
      const detail = event as Event & { navigationType?: string }
      if (detail.navigationType === 'traverse' && event.cancelable && !window.confirm(discardMessage)) event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    navigation?.addEventListener('navigate', traverse)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', click, true)
      navigation?.removeEventListener('navigate', traverse)
    }
  }, [protect])
}
