import { Node, Extension, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import { TerminalNodeView, MafsGraphNodeView, CalloutNodeView } from './NodeViews'

const lowlight = createLowlight(all)

// ── Math nodes ────────────────────────────────────────────────────────────────
export const InlineMath = Node.create({
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

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  addAttributes() { return { latex: { default: '' } } },
  parseHTML() { return [{ tag: 'div[data-block-math]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-block-math': node.attrs.latex }), node.attrs.latex]
  },
})

// ── Math keyboard shortcut extension ──────────────────────────────────────────
export const MathShortcut = Extension.create({
  name: 'mathShortcut',
  addKeyboardShortcuts() {
    const handleMath = () => {
      const { state } = this.editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 300), from)

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
    return { Space: handleMath, Enter: handleMath }
  },
})

// ── Mafs graph node ────────────────────────────────────────────────────────────
export const MafsGraphNode = Node.create({
  name: 'mafsGraph',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      functions: { default: [] },
      xMin: { default: -5 }, xMax: { default: 5 },
      yMin: { default: -5 }, yMax: { default: 5 },
      xStep: { default: null }, yStep: { default: null },
      showGrid: { default: true }, label: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-mafs-graph]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mafs-graph': JSON.stringify(node.attrs) })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MafsGraphNodeView as unknown as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})

// ── Terminal block node ────────────────────────────────────────────────────────
export const TerminalNode = Node.create({
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
    return ReactNodeViewRenderer(TerminalNodeView as unknown as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})

// ── Code block with extended attributes ───────────────────────────────────────
export const ExtendedCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'python',
}).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      startLine: { default: 1 },
      filename: { default: '' },
    }
  },
})

// ── Python heuristic linter ────────────────────────────────────────────────────
export type LintDiagnostic = { line: number; message: string; severity: 'error' | 'warning' }

function lintPython(code: string): LintDiagnostic[] {
  const issues: LintDiagnostic[] = []
  const lines = code.split('\n')

  lines.forEach((line, i) => {
    const ln = i + 1
    const stripped = line.trimEnd()
    const trimmed = stripped.trim()

    if (/^print\s+[^(]/.test(trimmed))
      issues.push({ line: ln, message: 'Python 2 print statement — use print() in Python 3', severity: 'error' })
    if (/^exec\s+[^(]/.test(trimmed))
      issues.push({ line: ln, message: 'Python 2 exec statement — use exec() in Python 3', severity: 'error' })
    if (/^\t/.test(line) && /^ /.test(code.split('\n').find(l => /^ /.test(l)) ?? ''))
      issues.push({ line: ln, message: 'Mixed tabs and spaces — use spaces consistently (PEP 8)', severity: 'warning' })
    if (/\s+$/.test(line) && line.length > 0)
      issues.push({ line: ln, message: 'Trailing whitespace', severity: 'warning' })
    if (/==\s*None/.test(trimmed) || /!=\s*None/.test(trimmed))
      issues.push({ line: ln, message: 'Use "is None" or "is not None" instead of == / !=', severity: 'warning' })
    if (/==\s*True/.test(trimmed) || /==\s*False/.test(trimmed))
      issues.push({ line: ln, message: 'Use "if x:" or "if not x:" instead of comparing to True/False', severity: 'warning' })
    if (/^except\s*:/.test(trimmed))
      issues.push({ line: ln, message: 'Bare except: catches all exceptions — specify exception type', severity: 'warning' })
    if (/def\s+\w+\s*\(.*=\s*(\[\]|\{\}|\(\))/.test(trimmed))
      issues.push({ line: ln, message: 'Mutable default argument — use None and set inside the function', severity: 'warning' })
    if (stripped.length > 79)
      issues.push({ line: ln, message: `Line too long (${stripped.length} > 79 characters, PEP 8)`, severity: 'warning' })
  })

  return issues
}

export const PythonLintExtension = Extension.create({
  name: 'pythonLint',
  addStorage() {
    return { diagnostics: [] as LintDiagnostic[] }
  },
  onUpdate() {
    const doc = this.editor.state.doc
    const diagnostics: LintDiagnostic[] = []
    doc.forEach((node) => {
      if (node.type.name === 'codeBlock') {
        const lang = node.attrs.language ?? 'python'
        if (lang === 'python' || lang === '') {
          diagnostics.push(...lintPython(node.textContent))
        }
      }
    })
    this.storage.diagnostics = diagnostics
    this.editor.view.dispatch(this.editor.state.tr.setMeta('pythonLint', diagnostics))
  },
})

// ── Callout block node ─────────────────────────────────────────────────────────
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      type: { default: 'tip' },
      content: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-callout]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': node.attrs.type, 'data-content': node.attrs.content })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView as unknown as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})
