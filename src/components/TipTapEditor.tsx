'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, Node, mergeAttributes, Extension, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import { all, createLowlight } from 'lowlight'
import katex from 'katex'
import dynamic from 'next/dynamic'
import 'katex/dist/katex.min.css'
import type { MafsGraphAttrs } from '@/components/MafsGraph'

const MafsGraph = dynamic(() => import('@/components/MafsGraph'), { ssr: false })

const lowlight = createLowlight(all)

// ── Math nodes ───────────────────────────────────────────────────────────────
const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() { return { latex: { default: '' } } },
  parseHTML() { return [{ tag: 'span[data-inline-math]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-inline-math': node.attrs.latex }), node.attrs.latex]
  },
})

const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  addAttributes() { return { latex: { default: '' } } },
  parseHTML() { return [{ tag: 'div[data-block-math]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-block-math': node.attrs.latex }), node.attrs.latex]
  },
})

// ── Mafs graph node ───────────────────────────────────────────────────────────
function MafsGraphNodeView({ node, selected }: { node: { attrs: Record<string, unknown> }; selected: boolean; updateAttributes: (attrs: Record<string, unknown>) => void; deleteNode: () => void }) {
  const attrs = node.attrs as unknown as MafsGraphAttrs
  return (
    <NodeViewWrapper>
      <div style={{
        outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
        borderRadius: 'var(--radius-lg)',
        transition: 'outline 0.1s',
      }}>
        <MafsGraph attrs={attrs} />
      </div>
    </NodeViewWrapper>
  )
}

const MafsGraphNode = Node.create({
  name: 'mafsGraph',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      functions: { default: [] },
      xMin: { default: -5 },
      xMax: { default: 5 },
      yMin: { default: -5 },
      yMax: { default: 5 },
      xStep: { default: null },
      yStep: { default: null },
      showGrid: { default: true },
      label: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-mafs-graph]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-mafs-graph': JSON.stringify(node.attrs),
    })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MafsGraphNodeView as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})

// ── Math keyboard shortcut extension ─────────────────────────────────────────
const MathShortcut = Extension.create({
  name: 'mathShortcut',
  addKeyboardShortcuts() {
    const handleMath = () => {
      const { state } = this.editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 300), from)

      // Block math: $$...$$ — must be at start of paragraph or after whitespace
      const blockMatch = textBefore.match(/\$\$([\s\S]+?)\$\$$/)
      if (blockMatch) {
        const latex = blockMatch[1].trim()
        if (latex) {
          this.editor.chain()
            .deleteRange({ from: from - blockMatch[0].length, to: from })
            .insertContent({ type: 'blockMath', attrs: { latex } })
            .run()
          return true
        }
      }

      // Inline math: $...$ — single dollar signs
      const inlineMatch = textBefore.match(/\$([^$\n]+)\$$/)
      if (inlineMatch) {
        const latex = inlineMatch[1].trim()
        if (latex) {
          this.editor.chain()
            .deleteRange({ from: from - inlineMatch[0].length, to: from })
            .insertContent({ type: 'inlineMath', attrs: { latex } })
            .run()
          return true
        }
      }
      return false
    }
    return {
      Space: handleMath,
      Enter: handleMath,
    }
  },
})

// ── Terminal block node ───────────────────────────────────────────────────────
function TerminalNodeView({ node, selected }: { node: { attrs: { prompt: string; content: string } }; selected: boolean; updateAttributes: (a: Record<string, unknown>) => void }) {
  return (
    <NodeViewWrapper>
      <div style={{
        background: '#0d1117',
        borderRadius: 8,
        padding: '12px 16px',
        margin: '0.75rem 0',
        fontFamily: "'Fira Mono', 'Cascadia Code', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        outline: selected ? '3px solid var(--amber)' : 'none',
        border: '1px solid #30363d',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
        </div>
        <pre style={{ margin: 0, color: '#e6edf3', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{node.attrs.content}</pre>
      </div>
    </NodeViewWrapper>
  )
}

const TerminalNode = Node.create({
  name: 'terminalBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      content: { default: '$ ' },
      prompt: { default: '$' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-terminal]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-terminal': node.attrs.content })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(TerminalNodeView as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})

// ── Language-aware code block node view ───────────────────────────────────────
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'plaintext', label: 'Plain text' },
]

// ── Python heuristic linter extension ────────────────────────────────────────
function lintPython(code: string): { line: number; message: string; severity: 'error' | 'warning' }[] {
  const issues: { line: number; message: string; severity: 'error' | 'warning' }[] = []
  const lines = code.split('\n')

  lines.forEach((line, i) => {
    const ln = i + 1
    const stripped = line.trimEnd()
    const trimmed = stripped.trim()

    // Python 2 print statement
    if (/^print\s+[^(]/.test(trimmed)) {
      issues.push({ line: ln, message: 'Python 2 print statement — use print() in Python 3', severity: 'error' })
    }
    // Python 2 exec statement
    if (/^exec\s+[^(]/.test(trimmed)) {
      issues.push({ line: ln, message: 'Python 2 exec statement — use exec() in Python 3', severity: 'error' })
    }
    // Tabs vs spaces (mixed)
    if (/^\t/.test(line) && /^ /.test(code.split('\n').find(l => /^ /.test(l)) ?? '')) {
      issues.push({ line: ln, message: 'Mixed tabs and spaces — use spaces consistently (PEP 8)', severity: 'warning' })
    }
    // Trailing whitespace
    if (/\s+$/.test(line) && line.length > 0) {
      issues.push({ line: ln, message: 'Trailing whitespace', severity: 'warning' })
    }
    // == None / != None (should use is/is not)
    if (/==\s*None/.test(trimmed) || /!=\s*None/.test(trimmed)) {
      issues.push({ line: ln, message: 'Use "is None" or "is not None" instead of == / !=', severity: 'warning' })
    }
    // == True / == False
    if (/==\s*True/.test(trimmed) || /==\s*False/.test(trimmed)) {
      issues.push({ line: ln, message: 'Use "if x:" or "if not x:" instead of comparing to True/False', severity: 'warning' })
    }
    // Bare except
    if (/^except\s*:/.test(trimmed)) {
      issues.push({ line: ln, message: 'Bare except: catches all exceptions — specify exception type', severity: 'warning' })
    }
    // mutable default argument
    if (/def\s+\w+\s*\(.*=\s*(\[\]|\{\}|\(\))/.test(trimmed)) {
      issues.push({ line: ln, message: 'Mutable default argument — use None and set inside the function', severity: 'warning' })
    }
    // Line too long (>79 chars per PEP 8)
    if (stripped.length > 79) {
      issues.push({ line: ln, message: `Line too long (${stripped.length} > 79 characters, PEP 8)`, severity: 'warning' })
    }
  })

  return issues
}

const PythonLintExtension = Extension.create({
  name: 'pythonLint',
  addStorage() {
    return { diagnostics: [] as { line: number; message: string; severity: 'error' | 'warning' }[] }
  },
  onUpdate() {
    const doc = this.editor.state.doc
    const diagnostics: { line: number; message: string; severity: 'error' | 'warning' }[] = []
    doc.forEach((node) => {
      if (node.type.name === 'codeBlock') {
        const lang = node.attrs.language ?? 'python'
        if (lang === 'python' || lang === '') {
          const results = lintPython(node.textContent)
          diagnostics.push(...results)
        }
      }
    })
    this.storage.diagnostics = diagnostics
    // Force re-render by dispatching a meta transaction
    this.editor.view.dispatch(this.editor.state.tr.setMeta('pythonLint', diagnostics))
  },
})

// ── Pack definitions ──────────────────────────────────────────────────────────
export type EditorPack = 'math' | 'code' | 'graph' | 'python-lint' | 'terminal' | 'lang-select'

// ── Props ─────────────────────────────────────────────────────────────────────
interface TipTapEditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  editable?: boolean
  packs?: EditorPack[]
  onEditorReady?: (insert: (doc: Record<string, unknown>) => void) => void
  onGraphButtonClick?: () => void
  onInsertGraph?: (insert: (attrs: MafsGraphAttrs) => void) => void
  onLatexButtonClick?: () => void
  onInsertLatex?: (insert: (latex: string, displayMode: boolean) => void) => void
}

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  packs = ['math', 'code'],
  onEditorReady,
  onGraphButtonClick,
  onInsertGraph,
  onLatexButtonClick,
  onInsertLatex,
}: TipTapEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const hasMath = packs.includes('math')
  const hasCode = packs.includes('code')
  const hasGraph = packs.includes('graph')
  const hasPythonLint = packs.includes('python-lint')
  const hasTerminal = packs.includes('terminal')
  const hasLangSelect = packs.includes('lang-select')

  const [lintDiagnostics, setLintDiagnostics] = useState<{ line: number; message: string; severity: 'error' | 'warning' }[]>([])
  const [showTerminalModal, setShowTerminalModal] = useState(false)
  const [terminalContent, setTerminalContent] = useState('$ ')

  // ── Build extensions list based on packs ──────────────────────────────────
  const extensions = [
    StarterKit.configure({ codeBlock: false }),
    Image.configure({ inline: false, allowBase64: false }),
    ...(hasCode ? [CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'python' })] : []),
    ...(hasMath ? [InlineMath, BlockMath, MathShortcut] : []),
    ...(hasGraph ? [MafsGraphNode] : []),
    ...(hasTerminal ? [TerminalNode] : []),
    ...(hasPythonLint ? [PythonLintExtension] : []),
  ]

  // ── Editor instance ───────────────────────────────────────────────────────
  const editor = useEditor({
    extensions,
    content: content ?? '',
    editable,
    onCreate: ({ editor }) => {
      const doc = editor.state.doc
      const lastNode = doc.lastChild
      if (lastNode && lastNode.type.name !== 'paragraph') {
        editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' })
      }
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  // ── Expose insert function for markdown import ────────────────────────────
  useEffect(() => {
    if (!editor || !onEditorReady) return
    onEditorReady((doc: Record<string, unknown>) => {
      const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
      nodes.forEach((node) => {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, node).run()
      })
    })
  }, [editor, onEditorReady])

  // ── Render KaTeX ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMath || !editorRef.current) return
    editorRef.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      try { katex.render(el.dataset.inlineMath ?? '', el, { throwOnError: false, displayMode: false }) }
      catch { /* ignore */ }
    })
    editorRef.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      try { katex.render(el.dataset.blockMath ?? '', el, { throwOnError: false, displayMode: true }) }
      catch { /* ignore */ }
    })
  })

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) { const d = await res.json(); alert(`Upload failed: ${d.error}`); return }
      const { url } = await res.json()
      editor.chain().focus().setImage({ src: url }).run()
    } finally { setUploading(false) }
  }, [editor])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleImageUpload(file)
    e.target.value = ''
  }

  // ── Insert LaTeX from modal ───────────────────────────────────────────────
  const insertLatexFormula = useCallback((latex: string, displayMode: boolean) => {
    if (!editor) return
    if (displayMode) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run()
    }
  }, [editor])

  // Expose insertLatexFormula to parent
  useEffect(() => {
    onInsertLatex?.(insertLatexFormula)
  }, [insertLatexFormula, onInsertLatex])

  const insertTerminal = useCallback((content: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'terminalBlock', attrs: { content } }).run()
    setShowTerminalModal(false)
  }, [editor])

  // Sync lint diagnostics from extension storage
  useEffect(() => {
    if (!editor || !hasPythonLint) return
    const update = () => {
      const storage = (editor.extensionStorage as Record<string, unknown>).pythonLint as { diagnostics: { line: number; message: string; severity: 'error' | 'warning' }[] } | undefined
      setLintDiagnostics(storage?.diagnostics ?? [])
    }
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor, hasPythonLint])

  const insertGraph = useCallback((attrs: MafsGraphAttrs) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'mafsGraph', attrs }).run()
  }, [editor])

  // Expose insertGraph to parent via onInsertGraph callback
  useEffect(() => {
    onInsertGraph?.(insertGraph)
  }, [insertGraph, onInsertGraph])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)' }}>
      {editable && editor && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
          {hasCode && (
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>Code</ToolbarButton>
          )}
          {hasTerminal && (
            <ToolbarButton onClick={() => setShowTerminalModal(true)} active={false}>⬛ Terminal</ToolbarButton>
          )}
          {hasLangSelect && editor.isActive('codeBlock') && (
            <select
              value={editor.getAttributes('codeBlock').language ?? 'python'}
              onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()}
              style={{
                padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
              }}
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          )}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>" Quote</ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} active={false}>
            {uploading ? 'Uploading...' : '🖼 Image'}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {hasMath && (
            <ToolbarButton onClick={() => onLatexButtonClick?.()} active={false}>∑ Formula</ToolbarButton>
          )}
          {hasGraph && (
            <ToolbarButton onClick={() => onGraphButtonClick?.()} active={false}>📈 Graph</ToolbarButton>
          )}
          {hasMath && (
            <>
              <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
                $x^2$ or $$x^2$$ then Space
              </span>
            </>
          )}
        </div>
      )}
      <div
        ref={editorRef}
        onClick={() => editor?.commands.focus()}
        style={{ minHeight: editable ? 400 : undefined, cursor: editable ? 'text' : 'default' }}
      >
        <EditorContent
          editor={editor}
          style={{ padding: '1rem', fontSize: 15, lineHeight: 1.7 }}
        />
      </div>
      <style>{`
        .tiptap:focus { outline: none; }
        .tiptap h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; }
        .tiptap h3 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; }
        .tiptap p { margin: 0 0 0.75rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap blockquote { border-left: 3px solid var(--border); margin: 0 0 0.75rem; padding-left: 1rem; color: var(--text-2); }
        .tiptap pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0 0 0.75rem; font-size: 13px; }
        .tiptap code { background: var(--surface-2); padding: 2px 5px; border-radius: 3px; font-size: 13px; }
        .tiptap pre code { background: none; padding: 0; }
        .tiptap [data-block-math] { text-align: center; margin: 1rem 0; cursor: pointer; padding: 4px 8px; border-radius: 4px; border: 2px solid transparent; }
        .tiptap [data-block-math]:hover { border-color: var(--border); }
        .tiptap .ProseMirror-selectednode[data-block-math] { outline: 3px solid var(--amber); border-radius: 4px; }
        .tiptap [data-inline-math] { display: inline; cursor: pointer; border-radius: 3px; border: 1px solid transparent; padding: 0 2px; }
        .tiptap [data-inline-math]:hover { border-color: var(--border); }
        .tiptap .ProseMirror-selectednode[data-inline-math] { outline: 3px solid var(--amber); border-radius: 3px; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5rem 0; display: block; }
        .tiptap img.ProseMirror-selectednode { outline: 3px solid var(--amber); }
        .tiptap [data-terminal] { font-family: monospace; }
        .tiptap .ProseMirror-selectednode [data-terminal-inner] { outline: 3px solid var(--amber); }
      `}</style>
      {/* Terminal insert modal */}
      {showTerminalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTerminalModal(false) }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onClick={(e) => e.stopPropagation()}>
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
              <button onClick={() => insertTerminal(terminalContent)} className="btn btn-primary btn-sm">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Python lint panel */}
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
    </div>
  )
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
