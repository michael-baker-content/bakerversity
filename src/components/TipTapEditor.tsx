'use client'
import LatexActivation from './editor/LatexActivationPanel'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import FindAndReplace from '@tiptap/extension-find-and-replace'
import InvisibleCharacters, { SpaceCharacter, HardBreakNode, ParagraphNode, InvisibleCharacter } from '@tiptap/extension-invisible-characters'
import { TextLanguage } from './editor/TextLanguage'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import type { MafsGraphAttrs } from '@/components/MafsGraph'
import {
  InlineMath, BlockMath, MathShortcut,
  MafsGraphNode, TerminalNode, CalloutNode,
  ExtendedCodeBlock, PythonLintExtension, PracticeQuizNode,
} from './editor/nodes'
import type { LintDiagnostic } from './editor/nodes'
import { Toolbar } from './editor/Toolbar'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

// ── JSON → Markdown converter ─────────────────────────────────────────────────
function nodeToMd(node: Record<string, unknown>, indent = '', num?: number): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = () => content.map((n) => nodeToMd(n, indent)).join('')

  switch (type) {
    case 'doc': return content.map((n) => nodeToMd(n)).join('\n')
    case 'paragraph': return children() ? `${children()}\n` : '\n'
    case 'heading': return `${'#'.repeat((attrs.level as number) ?? 2)} ${children()}\n`
    case 'bulletList': return content.map((n) => nodeToMd(n, indent)).join('') + '\n'
    case 'orderedList': return content.map((n, i) => nodeToMd(n, indent, i + 1)).join('') + '\n'
    case 'listItem':
      return num !== undefined
        ? `${indent}${num}. ${content.map((n) => nodeToMd(n, indent + '   ')).join('').trimEnd()}\n`
        : `${indent}- ${content.map((n) => nodeToMd(n, indent + '  ')).join('').trimEnd()}\n`
    case 'blockquote': return children().split('\n').map((l) => `> ${l}`).join('\n') + '\n'
    case 'codeBlock': {
      const lang = (attrs.language as string) ?? ''
      return `\`\`\`${lang}\n${children()}\n\`\`\`\n`
    }
    case 'table': {
      const rows = content.map((n) => nodeToMd(n, indent))
      // Insert separator row after header
      if (rows.length > 0) {
        const headerCols = (content[0].content as Record<string, unknown>[] | undefined)?.length ?? 1
        rows.splice(1, 0, '|' + ' --- |'.repeat(headerCols))
      }
      return rows.join('\n') + '\n'
    }
    case 'tableRow': return '| ' + content.map((n) => nodeToMd(n, indent)).join(' | ') + ' |\n'
    case 'tableCell':
    case 'tableHeader': return children().replace(/\n/g, ' ').trim()
    case 'horizontalRule': return '---\n'
    case 'hardBreak': return '  \n'
    case 'inlineMath': return `$${attrs.latex ?? ''}$`
    case 'blockMath': return `$$\n${attrs.latex ?? ''}\n$$\n`
    case 'terminalBlock': return `\`\`\`bash\n${attrs.content ?? ''}\n\`\`\`\n`
    case 'callout': {
      const label = (attrs.type as string) ?? 'note'
      return `> **${label.toUpperCase()}**: ${attrs.content ?? ''}\n`
    }
    case 'text': {
      const marks = (node.marks as { type: string }[]) ?? []
      let t = (node.text as string) ?? ''
      if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
      if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
      if (marks.some((m) => m.type === 'code')) t = `\`${t}\``
      return t
    }
    default: return children()
  }
}

function jsonToMarkdown(doc: Record<string, unknown>): string {
  return nodeToMd(doc).replace(/\n{3,}/g, '\n\n').trim()
}

// Disables all markdown input rules (**, *, #, ---, etc.)
const NoInputRules = Extension.create({
  name: 'noInputRules',
  addInputRules() { return [] },
})

export type EditorPack = 'math' | 'code' | 'graph' | 'python-lint' | 'terminal' | 'lang-select'

interface TipTapEditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  editable?: boolean
  packs?: EditorPack[]
  onEditorReady?: (insert: (doc: Record<string, unknown>) => void) => void
  onExportReady?: (exportFn: (format: 'html' | 'markdown' | 'txt') => void) => void
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
  onExportReady,
  onGraphButtonClick,
  onInsertGraph,
  onLatexButtonClick,
  onInsertLatex,
}: TipTapEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [lintDiagnostics, setLintDiagnostics] = useState<LintDiagnostic[]>([])
  const [showTerminalModal, setShowTerminalModal] = useState(false)
  const [terminalContent, setTerminalContent] = useState('$ ')
  const [filenameInput, setFilenameInput] = useState('')
  const [showCalloutPicker, setShowCalloutPicker] = useState(false)
  // Latex editing — null = inserting new, object = editing existing node
  const [editingLatex, setEditingLatex] = useState<{ latex: string; displayMode: boolean; pos: number } | null>(null)

  const replacementInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState('')

  // Image modal — shown after upload and on double-click of existing image
  const [imageModal, setImageModal] = useState<{
    src: string
    width?: number
    height?: number
    alt: string
    title: string
    pos: number | null   // null = newly uploaded (insert), number = existing (update)
  } | null>(null)

  const [showLatexActivation, setShowLatexActivation] = useState(false)
  const hasMath = packs.includes('math')
  const hasCode = packs.includes('code')
  const hasGraph = packs.includes('graph')
  const hasPythonLint = packs.includes('python-lint')
  const hasTerminal = packs.includes('terminal')

  // ── Extensions ─────────────────────────────────────────────────────────────
  const extensions = [
    StarterKit.configure({ codeBlock: false, link: false, underline: false, trailingNode: false }),
    NoInputRules,
    Highlight.configure({ HTMLAttributes: { style: 'background-color:#fef08a;color:#1f2937' } }),
    TextLanguage,
    FindAndReplace.configure({ searchDebounceMs: 0 }),
    InvisibleCharacters.configure({ visible: false, builders: [
      new SpaceCharacter(), new HardBreakNode(), new ParagraphNode(),
      new InvisibleCharacter({ type: 'nonbreaking-space', predicate: value => value === '\u00a0' }),
    ] }),
    Image.configure({ inline: false, allowBase64: false }),
    CalloutNode,
    Table.configure({ resizable: false, HTMLAttributes: { style: 'width: auto; min-width: 0;' } }),
    TableRow,
    TableCell,
    TableHeader,
    ...(hasCode ? [ExtendedCodeBlock] : []),
    ...(hasMath ? [InlineMath, BlockMath, MathShortcut] : []),
    ...(hasGraph ? [MafsGraphNode] : []),
    ...(hasTerminal ? [TerminalNode] : []),
    ...(hasPythonLint ? [PythonLintExtension] : []),
    PracticeQuizNode,
  ]

  // ── Editor ─────────────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false,
    // Toolbar state follows cursor/selection changes as it did in Tiptap 2.
    shouldRerenderOnTransaction: true,
    extensions,
    content: content ?? '',
    editable,
    onCreate: ({ editor }) => {
      const doc = editor.state.doc
      if (doc.lastChild?.type.name !== 'paragraph') {
        editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' })
      }
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      handleDOMEvents: {
        dblclick: (view, event) => {
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (!pos) return false
          const node = view.state.doc.nodeAt(pos.pos)
          if (!node) {
            // Try one position back (cursor may be after the node)
            const nodeBefore = view.state.doc.nodeAt(pos.pos - 1)
            if (hasMath && nodeBefore && (nodeBefore.type.name === 'inlineMath' || nodeBefore.type.name === 'blockMath')) {
              setEditingLatex({ latex: nodeBefore.attrs.latex, displayMode: nodeBefore.type.name === 'blockMath', pos: pos.pos - 1 })
              return true
            }
            return false
          }
          if (hasMath && (node.type.name === 'inlineMath' || node.type.name === 'blockMath')) {
            setEditingLatex({ latex: node.attrs.latex, displayMode: node.type.name === 'blockMath', pos: pos.pos })
            return true
          }
          if (node.type.name === 'image') {
            setImageModal({
              src: node.attrs.src ?? '',
              width: node.attrs.width,
              height: node.attrs.height,
              alt: node.attrs.alt ?? '',
              title: node.attrs.title ?? '',
              pos: pos.pos,
            })
            return true
          }

          return false
        },
      },
    },
  })

  // ── Expose insert-content to parent ────────────────────────────────────────
  useEffect(() => {
    if (!editor || !onEditorReady) return
    onEditorReady((doc: Record<string, unknown>) => {
      const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
      nodes.forEach((node) => {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, node).run()
      })
    })
  }, [editor, onEditorReady])

  // ── Listen for editingLatex meta from math node views ─────────────────────
  useEffect(() => {
    if (!editor || !hasMath) return
    const update = () => {
      const meta = editor.state.tr.getMeta('editingLatex')
      if (meta) setEditingLatex(meta)
    }
    editor.on('transaction', ({ transaction }) => {
      const meta = transaction.getMeta('editingLatex')
      if (meta) setEditingLatex(meta)
    })
  }, [editor, hasMath])

  useEffect(() => {
    if (!editor) return
    const track = ({transaction}: {transaction: import('@tiptap/pm/state').Transaction}) => {
      if (!transaction.docChanged) return
      setImageModal(current => {
        if (!current || current.pos === null) return current
        const mapped = transaction.mapping.mapResult(current.pos)
        if (mapped.deleted || transaction.doc.nodeAt(mapped.pos)?.type.name !== 'image') return null
        return {...current, pos:mapped.pos}
      })
    }
    editor.on('transaction',track)
    return () => {editor.off('transaction',track)}
  },[editor])

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File, replace = false) => {
    if (!editor) return
    setUploading(true)
    setImageError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed.') }
      const { url } = await res.json()
      if (typeof url !== 'string' || !url) throw new Error('Upload did not return an image URL.')
      // Show modal to set alt text and caption before inserting
      let dimensions: { width?: number; height?: number } = {}
      try { const bitmap = await createImageBitmap(file); dimensions = { width: bitmap.width, height: bitmap.height }; bitmap.close() } catch { /* Older browsers still insert the image. */ }
      if (replace) setImageModal(current => current ? {...current, src:url, width:dimensions.width, height:dimensions.height} : current)
      else setImageModal({ src: url, ...dimensions, alt: '', title: '', pos: null })
    } catch (error) { const message = error instanceof Error ? error.message : 'Upload failed. Please try again.'; if (replace) setImageError(message); else alert(message) }
    finally { setUploading(false) }
  }, [editor])

  // ── LaTeX insert ───────────────────────────────────────────────────────────
  const insertLatexFormula = useCallback((latex: string, displayMode: boolean) => {
    if (!editor) return
    if (displayMode) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run()
    }
  }, [editor])

  useEffect(() => { onInsertLatex?.(insertLatexFormula) }, [insertLatexFormula, onInsertLatex])

  // ── Terminal insert ────────────────────────────────────────────────────────
  const insertTerminal = useCallback((content: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'terminalBlock', attrs: { content } }).run()
    setShowTerminalModal(false)
  }, [editor])

  // ── Filename sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    const update = () => {
      if (editor.isActive('codeBlock')) {
        setFilenameInput(editor.getAttributes('codeBlock').filename ?? '')
      }
    }
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    return () => { editor.off('selectionUpdate', update); editor.off('update', update) }
  }, [editor])

  // ── Lint diagnostics sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!editor || !hasPythonLint) return
    const update = () => {
      const storage = (editor.extensionStorage as unknown as Record<string, unknown>).pythonLint as { diagnostics: LintDiagnostic[] } | undefined
      setLintDiagnostics(storage?.diagnostics ?? [])
    }
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor, hasPythonLint])

  // ── Graph insert ──────────────────────────────────────────────────────────
  const insertGraph = useCallback((attrs: MafsGraphAttrs) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'mafsGraph', attrs }).run()
  }, [editor])

  useEffect(() => { onInsertGraph?.(insertGraph) }, [insertGraph, onInsertGraph])

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAs = useCallback((format: 'html' | 'markdown' | 'txt') => {
    if (!editor) return
    let content: string
    if (format === 'html') content = editor.getHTML()
    else if (format === 'txt') content = editor.getText()
    else content = jsonToMarkdown(editor.getJSON() as Record<string, unknown>)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = format === 'html' ? 'lesson.html' : format === 'txt' ? 'lesson.txt' : 'lesson.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [editor])

  useEffect(() => { onExportReady?.(exportAs) }, [exportAs, onExportReady])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="editor-shell" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'visible', background: 'var(--surface)', position: 'relative' }}>
      {editable && editor && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              await handleImageUpload(file)
              e.target.value = ''
            }}
          />
          <div className="editor-toolbar-shell" style={{ position: 'sticky', top: 52, zIndex: 10, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
            <Toolbar
              editor={editor}
              packs={packs}
              uploading={uploading}
              showCalloutPicker={showCalloutPicker}
              showTerminalModal={showTerminalModal}
              terminalContent={terminalContent}
              filenameInput={filenameInput}
              lintDiagnostics={lintDiagnostics}
              onFileClick={() => fileInputRef.current?.click()}
              onLatexButtonClick={onLatexButtonClick}
              onActivateLatex={() => setShowLatexActivation(value => !value)}
              onGraphButtonClick={onGraphButtonClick}
              onInsertTerminal={insertTerminal}
              onInsertPracticeQuiz={() => editor?.chain().focus().insertContent({
                type: 'practiceQuiz',
                attrs: { title: 'Practice Quiz', questions: [] },
              }).run()}
              setShowCalloutPicker={setShowCalloutPicker}
              setShowTerminalModal={setShowTerminalModal}
              setTerminalContent={setTerminalContent}
              setFilenameInput={setFilenameInput}
            />

            {hasMath && showLatexActivation && <LatexActivation editor={editor} onClose={() => setShowLatexActivation(false)} />}
          </div>
        </>
      )}
      <div
        ref={editorRef}
        onClick={() => editor?.commands.focus()}
        style={{ minHeight: editable ? 400 : undefined, cursor: editable ? 'text' : 'default' }}
      >
        <EditorContent editor={editor} style={{ padding: '1rem', fontSize: 15, lineHeight: 1.7 }} />
      </div>

      {/* LaTeX edit modal — triggered by double-clicking a formula */}
      {editingLatex && (
        <LatexModal
          initialLatex={editingLatex.latex}
          initialDisplayMode={editingLatex.displayMode}
          showDisplayToggle
          onInsert={(latex, displayMode) => {
            if (!editor) return
            const pos = editingLatex.pos
            const node = editor.state.doc.nodeAt(pos)
            if (node) {
              editor.chain()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .insertContentAt(pos, {
                  type: displayMode ? 'blockMath' : 'inlineMath',
                  attrs: { latex },
                })
                .run()
            }
            setEditingLatex(null)
          }}
          onClose={() => setEditingLatex(null)}
        />
      )}
      {/* Image alt/caption modal */}
      {imageModal && (
        <div style={{position:'fixed', inset:0, zIndex:1000, pointerEvents:'none'}}>
          <div role="dialog" aria-label="Image settings"
            style={{position:'absolute', right:16, bottom:16, pointerEvents:'auto', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.5rem', width:400, maxWidth:'calc(100vw - 32px)', maxHeight:'calc(100dvh - 32px)', overflowY:'auto', boxShadow:'var(--shadow-lg)'}}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 15 }}>Image settings</h3>
            <img src={imageModal.src} alt="" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 4, marginBottom: '1rem', display: 'block' }} />
            <input ref={replacementInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={async e => {const file=e.target.files?.[0];e.target.value='';if(file)await handleImageUpload(file,true)}} />
            <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={()=>replacementInputRef.current?.click()}>{uploading ? 'Uploading…' : 'Replace image'}</button>
            {imageError && <p role="alert" style={{color:'var(--danger)'}}>{imageError}</p>}
            <p style={{fontSize:12,color:'var(--text-3)'}}>You can copy text from the page while these settings stay open.</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Alt text</label>
              <input
                className="input"
                aria-label="Alt text"
                value={imageModal.alt}
                onChange={(e) => setImageModal((m) => m ? { ...m, alt: e.target.value } : m)}
                placeholder="Describe the image for screen readers…"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Caption <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
              <input
                className="input"
                aria-label="Caption"
                value={imageModal.title}
                onChange={(e) => setImageModal((m) => m ? { ...m, title: e.target.value } : m)}
                placeholder="Shown below the image…"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                className="btn btn-primary btn-sm"
                disabled={uploading}
                onClick={() => {
                  if (!editor || uploading) return
                  if (imageModal.pos === null) {
                    editor.chain().focus().setImage({ src: imageModal.src, alt: imageModal.alt, title: imageModal.title, width: imageModal.width, height: imageModal.height }).run()
                  } else {
                    const node = editor.state.doc.nodeAt(imageModal.pos)
                    if (node?.type.name === 'image') {
                      editor.chain().focus().setNodeSelection(imageModal.pos)
                        .updateAttributes('image', { src:imageModal.src, width:imageModal.width, height:imageModal.height, alt: imageModal.alt, title: imageModal.title })
                        .run()
                    }
                  }
                  setImageModal(null)
                }}
              >
                {uploading ? 'Uploading…' : imageModal.pos === null ? 'Insert image' : 'Update'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => {setImageModal(null);setImageError('')}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tiptap:focus { outline: none; }
        .tiptap h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; }
        .tiptap h3 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; }
        .tiptap p { margin: 0 0 0.75rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap blockquote { border-left: 3px solid var(--border); margin: 0 0 0.75rem; padding-left: 1rem; color: var(--text-2); }
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
        .tiptap table { border-collapse: collapse; width: auto; min-width: 120px; margin: 1rem 0; }
        .tiptap th, .tiptap td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 14px; }
        .tiptap th { background: var(--surface-2); font-weight: 600; }
        .tiptap .tiptap-invisible-character--nonbreaking-space::before { content: '°'; }
        .tiptap .selectedCell { background: var(--indigo-muted); }
        .tiptap pre[data-terminal-pre] { color: #e6edf3 !important; background: none !important; border: none !important; padding: 0 !important; }
        .tiptap .ProseMirror-selectednode [data-terminal-inner] { outline: 3px solid var(--amber); }
      `}</style>
    </div>
  )
}
