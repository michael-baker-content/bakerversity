export const CALLOUT_TYPES = [
  { value: 'tip',     label: 'Tip',             icon: '💡', color: 'var(--success)', bg: 'var(--success-bg)' },
  { value: 'info',    label: 'Did you know?',   icon: 'ℹ️', color: 'var(--indigo)',  bg: 'var(--indigo-muted)' },
  { value: 'warning', label: 'Warning',         icon: '⚠️', color: 'var(--amber-label)',   bg: 'var(--amber-muted)' },
  { value: 'note',    label: 'Note',            icon: '📝', color: 'var(--text-2)',  bg: 'var(--surface-2)' },
  { value: 'objectives', label: 'Objectives', icon: '🎯', color: 'var(--indigo)', bg: 'var(--indigo-muted)' },
  { value: 'reading', label: 'Further reading', icon: '📚', color: 'var(--indigo)',  bg: 'var(--indigo-muted)' },
  { value: 'alert',   label: 'Alert',           icon: '🚨', color: 'var(--danger)',  bg: 'var(--danger-bg, #fee2e2)' },
]

/** @param {unknown} value */
export function calloutDefinition(value) {
 const definition=CALLOUT_TYPES.find(item=>item.value===value)??CALLOUT_TYPES[0]
 return {...definition,border:definition.value==='warning'?'var(--amber)':definition.color}
}
