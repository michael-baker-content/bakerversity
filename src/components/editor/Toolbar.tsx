'use client'

import React from 'react'
import type { Editor } from '@tiptap/react'
import type { MafsGraphAttrs } from '@/components/MafsGraph'
import { CALLOUT_TYPES, LANGUAGES, LANG_EXTENSIONS } from './constants'

interface ToolbarProps {
  editor: Editor
  packs: string[]
  uploading: boolean
  showCalloutPicker: boolean
  showTerminalModal: boolean
  terminalContent: string
  filenameInput: string
  lintDiagnostics: { line: number; message: string; severity: 'error' | 'warning' }[]
  onFileClick: () => void
  onLatexButtonClick?: () => void
  onGraphButtonClick?: () => void
  onInsertTerminal: (content: string) => void
  onInsertPracticeQuiz?: () => void
  setShowCalloutPicker: (v: boolean | ((prev: boolean) => boolean)) => void
  setShowTerminalModal: (v: boolean) => void
  setTerminalContent: (v: string) => void
  setFilenameInput: (v: string) => void
}

function ToolbarButton({ onClick, active, children }: {
  onClick: () => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        padding: '3px 8px', fontSize: 12,
        fontWeight: active ? 600 : 400,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: active ? 'var(--surface-3, var(--border))' : 'var(--surface)',
        color: active ? 'var(--text)' : 'var(--text-2)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function Toolbar({
  editor, packs, uploading, showCalloutPicker, showTerminalModal,
  terminalContent, filenameInput, lintDiagnostics,
  onFileClick, onLatexButtonClick, onGraphButtonClick, onInsertTerminal,
  onInsertPracticeQuiz,
  setShowCalloutPicker, setShowTerminalModal, setTerminalContent, setFilenameInput,
}: ToolbarProps) {
  const hasMath      = packs.includes('math')
  const hasCode      = packs.includes('code')
  const hasGraph     = packs.includes('graph')
  const hasTerminal  = packs.includes('terminal')
  const hasLangSelect = packs.includes('lang-select')
  const hasPythonLint = packs.includes('python-lint')

  return (
    <>
      {/* ── Toolbar row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', background: 'var(--surface-2)' }}>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>&lt;/&gt;</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>\" Quote</ToolbarButton>

        {/* Callout picker */}
        <div style={{ position: 'relative' }}>
          <ToolbarButton onClick={() => setShowCalloutPicker((v) => !v)} active={showCalloutPicker}>
            ✦ Callout
          </ToolbarButton>
          {showCalloutPicker && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
              minWidth: 170, marginTop: 4, overflow: 'hidden',
            }}>
              {CALLOUT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: 'callout',
                      attrs: { type: t.value },
                      content: [{ type: 'paragraph' }],
                    }).run()
                    setShowCalloutPicker(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '7px 12px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                    textAlign: 'left', borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton onClick={onFileClick} active={false}>
          {uploading ? 'Uploading...' : '🖼 Image'}
        </ToolbarButton>

        {/* Table insert + context controls */}
        <div style={{ position: 'relative', display: 'inline-flex', gap: 4 }}>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            active={false}
          >
            ⊞ Table
          </ToolbarButton>
          {editor.isActive('table') && (
            <>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} active={false}>+Col</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} active={false}>+Row</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} active={false}>−Col</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} active={false}>−Row</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} active={false}>✕ Table</ToolbarButton>
            </>
          )}
        </div>

        <ToolbarButton onClick={() => onInsertPracticeQuiz?.()} active={false}>✦ Quiz</ToolbarButton>

        {hasMath && <ToolbarButton onClick={() => onLatexButtonClick?.()} active={false}>∑ Formula</ToolbarButton>}
        {hasGraph && <ToolbarButton onClick={() => onGraphButtonClick?.()} active={false}>📈 Graph</ToolbarButton>}
        {hasMath && (
          <>
            <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
              $x^2$ or $$x^2$$ then Space
            </span>
          </>
        )}

        {hasTerminal && (
          <ToolbarButton onClick={() => setShowTerminalModal(true)} active={false}>⬛ Terminal</ToolbarButton>
        )}

        {/* Code group — wraps as one unit */}
        {(hasCode || hasPythonLint || hasLangSelect) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
            <span style={{ width: 1, background: 'var(--border)', margin: '0 4px', alignSelf: 'stretch' }} />
            {hasCode && (
              <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>Code</ToolbarButton>
            )}
            {hasLangSelect && editor.isActive('codeBlock') && (
              <select
                value={editor.getAttributes('codeBlock').language ?? 'python'}
                onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()}
                style={{ padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer' }}
              >
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            )}
            {hasCode && editor.isActive('codeBlock') && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                  Line:
                  <input
                    type="number"
                    min={1}
                    value={editor.getAttributes('codeBlock').startLine ?? 1}
                    onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { startLine: parseInt(e.target.value) || 1 }).run()}
                    style={{ width: 44, padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </label>
                <input
                  type="text"
                  name="code-filename"
                  placeholder={`name.${LANG_EXTENSIONS[editor.getAttributes('codeBlock').language ?? 'python'] ?? 'py'}`}
                  value={filenameInput}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  data-1p-ignore="true"
                  onChange={(e) => setFilenameInput(e.target.value)}
                  onBlur={(e) => {
                    let name = e.target.value.trim()
                    if (name && !name.includes('.')) {
                      const lang = editor.getAttributes('codeBlock').language ?? 'python'
                      const ext = LANG_EXTENSIONS[lang] ?? 'txt'
                      name = `${name}.${ext}`
                      setFilenameInput(name)
                    }
                    editor.chain().updateAttributes('codeBlock', { filename: name }).run()
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  style={{ padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', width: 110 }}
                />
              </>
            )}
          </span>
        )}
      </div>

      {/* ── Terminal modal ───────────────────────────────────────────────── */}
      {showTerminalModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTerminalModal(false) }}
        >
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Insert terminal block</h3>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Content</label>
              <textarea
                value={terminalContent}
                onChange={(e) => setTerminalContent(e.target.value)}
                rows={6}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: '#0d1117', color: '#e6edf3', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '4px 0 0' }}>Enter terminal output exactly as it should appear.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTerminalModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={() => onInsertTerminal(terminalContent)} className="btn btn-primary btn-sm">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Python lint panel ────────────────────────────────────────────── */}
      {hasPythonLint && lintDiagnostics.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)', padding: '8px 12px', maxHeight: 140, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Python linter</div>
          {lintDiagnostics.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: d.severity === 'error' ? 'var(--danger)' : 'var(--amber)', fontWeight: 600, flexShrink: 0 }}>
                {d.severity === 'error' ? '✕' : '⚠'} L{d.line}
              </span>
              <span style={{ color: 'var(--text-2)' }}>{d.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
