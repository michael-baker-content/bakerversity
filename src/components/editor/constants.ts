export const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'sql', label: 'SQL' },
  { value: 'java', label: 'Java' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'toml', label: 'TOML' },
  { value: 'xliff', label: 'XLIFF (.xlf)' },
  { value: 'tmx', label: 'TMX — translation memory' },
  { value: 'tbx', label: 'TBX — terminology' },
  { value: 'properties', label: 'Java properties' },
  { value: 'ini', label: 'INI' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'diff', label: 'Diff / patch' },
  { value: 'plaintext', label: 'Plain text' },
]

export const LANG_EXTENSIONS: Record<string, string> = {
  python: 'py', javascript: 'js', typescript: 'ts', html: 'html',
  css: 'css', bash: 'sh', powershell: 'ps1', sql: 'sql', json: 'json', java: 'java',
  yaml: 'yaml', xml: 'xml', toml: 'toml', xliff: 'xlf', xlf: 'xlf',
  tmx: 'tmx', tbx: 'tbx', properties: 'properties', ini: 'ini', markdown: 'md', diff: 'diff',
  // Preserve downloads for existing blocks whose languages are no longer offered.
  c: 'c', cpp: 'cpp', rust: 'rs', go: 'go', plaintext: 'txt',
}

export { CALLOUT_TYPES } from '../../lib/callouts.mjs'
