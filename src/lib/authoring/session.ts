export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict' | 'uncertain'
export interface EditingSession {
  baseline: string | null
  version: number | null
  status: SaveStatus
  message: string
}
export const initialSession: EditingSession = { baseline: null, version: null, status: 'idle', message: '' }
export type SessionAction =
  | { type: 'loaded'; snapshot: string; version: number }
  | { type: 'saving' }
  | { type: 'saved'; snapshot: string; version: number }
  | { type: 'failed'; message: string; conflict: boolean; uncertain: boolean }

export function sessionReducer(state: EditingSession, action: SessionAction): EditingSession {
  switch (action.type) {
    case 'loaded': return { baseline: action.snapshot, version: action.version, status: 'idle', message: '' }
    case 'saving': return { ...state, status: 'saving', message: '' }
    // Acknowledge the submitted snapshot, never edits typed while the request was pending.
    case 'saved': return { baseline: action.snapshot, version: action.version, status: 'saved', message: 'Changes saved.' }
    case 'failed': return { ...state, status: action.conflict ? 'conflict' : action.uncertain ? 'uncertain' : 'failed', message: action.message }
  }
}
export function hasUnsavedChanges(state: EditingSession, snapshot: string): boolean {
  return state.baseline !== null && state.baseline !== snapshot
}
export function canSave(state: EditingSession): boolean {
  return state.version !== null && !['saving', 'conflict', 'uncertain'].includes(state.status)
}
