'use client'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { requestJson, AuthoringRequestError } from './request'
import { canSave, hasUnsavedChanges, initialSession, sessionReducer } from './session'

export function useAuthoringSession(snapshot: string, sessionKey: string) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession)
  const inFlight = useRef<string | null>(null)
  const currentKey = useRef(sessionKey)
  currentKey.current = sessionKey
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const dirty = hasUnsavedChanges(state, snapshot)
  const needsProtection = dirty || ['saving', 'conflict', 'uncertain'].includes(state.status)
  const initialize = useCallback((value: string, version: number) => {
    dispatch({ type: 'loaded', snapshot: value, version })
  }, [])

  async function save(url: string, body: Record<string, unknown>): Promise<boolean> {
    if (inFlight.current === sessionKey || !canSave(state)) return false
    inFlight.current = sessionKey
    dispatch({ type: 'saving' })
    try {
      const data = await requestJson<{ version: number }>(url, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, version: state.version }),
      })
      if (!Number.isInteger(data.version) || data.version <= state.version!) {
        throw new AuthoringRequestError('Unable to confirm the saved version. Download a recovery copy, then reload to check the server.', 200, true)
      }
      // Next can reuse this component when navigating to a different lesson.
      if (!active.current || currentKey.current !== sessionKey) return false
      dispatch({ type: 'saved', snapshot, version: data.version })
      return true
    } catch (error) {
      if (active.current && currentKey.current === sessionKey) dispatch({ type: 'failed',
        message: error instanceof Error ? error.message : 'Unable to save. Your work is still here.',
        conflict: error instanceof AuthoringRequestError && error.status === 409,
        uncertain: !(error instanceof AuthoringRequestError) || error.uncertain,
      })
      return false
    } finally { if (inFlight.current === sessionKey) inFlight.current = null }
  }

  return { state, dirty, needsProtection, initialize, save, canSave: canSave(state) }
}
