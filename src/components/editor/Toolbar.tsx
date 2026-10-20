'use client'

import React, { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import WritingTools from './WritingTools'
import './toolbar.css'
import type { Editor } from '@tiptap/react'
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
  onActivateLatex?: () => void
  onLatexButtonClick?: () => void
  onGraphButtonClick?: () => void
  onInsertTerminal: (content: string) => void
  onInsertPracticeQuiz?: () => void
  setShowCalloutPicker: (v: boolean | ((prev: boolean) => boolean)) => void
  setShowTerminalModal: (v: boolean) => void
  setTerminalContent: (v: string) => void
  setFilenameInput: (v: string) => void
}

function ToolbarButton({ onClick, active, children, label }: { onClick: () => void; active: boolean; children: React.ReactNode; label?: string }) {
  return <button type="button" className="editor-tool" title={label} aria-label={label} aria-pressed={active} onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>
}

export function Toolbar({
  editor, packs, uploading, showCalloutPicker, showTerminalModal,
  terminalContent, filenameInput, lintDiagnostics,
  onFileClick, onActivateLatex, onLatexButtonClick, onGraphButtonClick, onInsertTerminal,
  onInsertPracticeQuiz,
  setShowCalloutPicker, setShowTerminalModal, setTerminalContent, setFilenameInput,
}: ToolbarProps) {
  const [insertOpen, setInsertOpen] = useState(false)
  const insertId = useId()
  const hasMath      = packs.includes('math')
  const hasCode      = packs.includes('code')
  const hasGraph     = packs.includes('graph')
  const hasTerminal  = packs.includes('terminal')
  const hasLangSelect = packs.includes('lang-select')
  const hasPythonLint = packs.includes('python-lint')

  return (
    <>
      <WritingTools editor={editor} formatting={<>
        <ToolbarButton label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><em>I</em></ToolbarButton>
        <span className="editor-desktop-inline"><ToolbarButton label="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>{'</>'}</ToolbarButton></span>
        <select className="editor-tool" aria-label="Text style" value={editor.isActive('heading', {level:2}) ? '2' : editor.isActive('heading', {level:3}) ? '3' : '0'} onChange={e => { const level = Number(e.target.value); if (level) editor.chain().focus().setHeading({level:level as 2|3}).run(); else editor.chain().focus().setParagraph().run() }}>
          <option value="0">Paragraph</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
        </select>
        <select className="editor-tool editor-desktop-list" aria-label="List style" value={editor.isActive('bulletList') ? 'bullet' : editor.isActive('orderedList') ? 'ordered' : ''} onChange={e => { const value=e.target.value; if(value==='bullet' || (!value && editor.isActive('bulletList'))) editor.chain().focus().toggleBulletList().run(); else if(value==='ordered' || (!value && editor.isActive('orderedList'))) editor.chain().focus().toggleOrderedList().run() }}>
          <option value="">List</option><option value="bullet">Bullets</option><option value="ordered">Numbered</option>
        </select>
      </>} extraFormatting={<><span className="editor-mobile-only"><ToolbarButton label="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>{'</>'}</ToolbarButton><select className="editor-tool" aria-label="List style" value={editor.isActive('bulletList') ? 'bullet' : editor.isActive('orderedList') ? 'ordered' : ''} onChange={e => { const value=e.target.value; if(value==='bullet' || (!value && editor.isActive('bulletList'))) editor.chain().focus().toggleBulletList().run(); else if(value==='ordered' || (!value && editor.isActive('orderedList'))) editor.chain().focus().toggleOrderedList().run() }}>
          <option value="">List</option><option value="bullet">Bullets</option><option value="ordered">Numbered</option>
        </select></span><ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>Quote</ToolbarButton></>} secondary={
        <div className="editor-insert-row" aria-label="Insert content" onKeyDown={e => {if(e.key==='Escape'){setInsertOpen(false);(e.currentTarget.querySelector('.editor-insert-toggle') as HTMLButtonElement)?.focus()}}}>
          <span className="editor-row-label">Insert</span>
          <button type="button" className="editor-tool editor-insert-toggle" aria-expanded={insertOpen} aria-controls={insertId} onClick={() => setInsertOpen(!insertOpen)}>Insert tools <span aria-hidden="true">⌄</span></button>
          <div id={insertId} className="editor-insert-tools" data-open={insertOpen} onClick={e => {if ((e.target as HTMLElement).closest('button')) setInsertOpen(false)}}>
            <ToolbarButton label="Directory tree" onClick={() => editor.chain().focus().insertContent({type:'directoryTree',attrs:{source:'',title:'Directory tree'}}).run()} active={editor.isActive('directoryTree')}>Directory tree</ToolbarButton>
            <ToolbarButton onClick={onFileClick} active={false}>{uploading ? 'Uploading…' : 'Image'}</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows:3, cols:3, withHeaderRow:true }).run()} active={false}>Table</ToolbarButton>
            <button type="button" className="editor-tool" aria-expanded={showCalloutPicker} onMouseDown={e => e.preventDefault()} onClick={() => setShowCalloutPicker(v => !v)}>Callout</button>
            <ToolbarButton onClick={() => onInsertPracticeQuiz?.()} active={false}>Quiz</ToolbarButton>
            {hasMath && <ToolbarButton label="Formula — type $x$ or $$x$$ then Space, or insert with this tool" onClick={() => onLatexButtonClick?.()} active={false}>Formula</ToolbarButton>}
            {hasMath && <ToolbarButton onClick={() => onActivateLatex?.()} active={false}>Activate LaTeX</ToolbarButton>}
            {hasGraph && <ToolbarButton onClick={() => onGraphButtonClick?.()} active={false}>Graph</ToolbarButton>}
            {hasCode && <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>Code</ToolbarButton>}
            {hasTerminal && <ToolbarButton onClick={() => setShowTerminalModal(true)} active={false}>Terminal</ToolbarButton>}
          </div>
        </div>
      } />
      {showCalloutPicker && <div className="editor-context" aria-label="Callout types">
        <span className="editor-row-label">Callout</span>
        {CALLOUT_TYPES.map(t => <button type="button" className="editor-tool" key={t.value} onClick={() => {editor.chain().focus().insertContent({type:'callout',attrs:{type:t.value},content:[{type:'paragraph'}]}).run();setShowCalloutPicker(false)}}>{t.label}</button>)}
        <button type="button" className="editor-tool" onClick={() => setShowCalloutPicker(false)}>Close</button>
      </div>}
      {editor.isActive('table') && <div className="editor-context" aria-label="Table controls">
        <span className="editor-row-label">Table</span>
        <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} active={false}>Add column</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} active={false}>Add row</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} active={false}>Remove column</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} active={false}>Remove row</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} active={false}>Delete table</ToolbarButton>
      </div>}
      {editor.isActive('codeBlock') && (hasCode || hasLangSelect) && <div className="editor-context" aria-label="Code settings">
        <span className="editor-row-label">Code settings</span>
            {hasLangSelect && editor.isActive('codeBlock') && (
              <select aria-label="Code language"
                value={editor.getAttributes('codeBlock').language ?? 'python'}
                onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()}
                style={{ padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer' }}
              >
                {!LANGUAGES.some(l => l.value === (editor.getAttributes('codeBlock').language ?? 'python')) && <option value={editor.getAttributes('codeBlock').language}>{editor.getAttributes('codeBlock').language || 'Plain text'} (existing block)</option>}
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
                  aria-label="Code filename"
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
                  style={{ padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', width: 110 }}
                />
              </>
            )}

      </div>}

      {/* ── Terminal modal ───────────────────────────────────────────────── */}
      {showTerminalModal && createPortal(
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
              <button type="button" onClick={() => setShowTerminalModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button type="button" onClick={() => onInsertTerminal(terminalContent)} className="btn btn-primary btn-sm">Insert</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Python lint panel ────────────────────────────────────────────── */}
      {hasPythonLint && editor.isActive('codeBlock') && lintDiagnostics.length > 0 && (
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
