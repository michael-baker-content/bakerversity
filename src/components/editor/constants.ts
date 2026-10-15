export const LANGUAGES = [
  { value: 'python',     label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html',       label: 'HTML' },
  { value: 'css',        label: 'CSS' },
  { value: 'bash',       label: 'Bash' },
  { value: 'sql',        label: 'SQL' },
  { value: 'json',       label: 'JSON' },
  { value: 'java',       label: 'Java' },
  { value: 'c',          label: 'C' },
  { value: 'cpp',        label: 'C++' },
  { value: 'rust',       label: 'Rust' },
  { value: 'go',         label: 'Go' },
  { value: 'plaintext',  label: 'Plain text' },
]

export const LANG_EXTENSIONS: Record<string, string> = {
  python: 'py', javascript: 'js', typescript: 'ts', html: 'html',
  css: 'css', bash: 'sh', sql: 'sql', json: 'json', java: 'java',
  c: 'c', cpp: 'cpp', rust: 'rs', go: 'go', plaintext: 'txt',
}

export const CALLOUT_TYPES = [
  { value: 'tip',     label: 'Tip',             icon: '💡', color: 'var(--success)', bg: 'var(--success-bg)' },
  { value: 'info',    label: 'Did you know?',   icon: 'ℹ️', color: 'var(--indigo)',  bg: 'var(--indigo-muted)' },
  { value: 'warning', label: 'Warning',         icon: '⚠️', color: 'var(--amber)',   bg: 'var(--amber-muted)' },
  { value: 'note',    label: 'Note',            icon: '📝', color: 'var(--text-2)',  bg: 'var(--surface-2)' },
  { value: 'objectives', label: 'Objectives', icon: '🎯', color: 'var(--indigo)', bg: 'var(--indigo-muted)' },
  { value: 'reading', label: 'Further reading', icon: '📚', color: 'var(--indigo)',  bg: 'var(--indigo-muted)' },
  { value: 'alert',   label: 'Alert',           icon: '🚨', color: 'var(--danger)',  bg: 'var(--danger-bg, #fee2e2)' },
]
