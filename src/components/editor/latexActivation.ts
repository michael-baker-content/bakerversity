import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import katex from 'katex'

export type LatexCandidate = { from: number; to: number; latex: string; display: boolean }

/** Scan text only, retaining document positions across marks and paragraph breaks. */
export function findLatex(doc: ProseMirrorNode): LatexCandidate[] {
  const results: LatexCandidate[] = []
  function scan(text: string, positions: number[]) {
    const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([^\n]+?)\\\)|\$([^$\n]+?)\$/g
    for (const match of text.matchAll(pattern)) {
      const index = match.index!, raw = match[0]
      let slashes = 0
      for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) slashes++
      if (slashes % 2 || raw.includes('\ufffc')) continue
      const display = match[1] !== undefined || match[2] !== undefined
      const body = match[1] ?? match[2] ?? match[3] ?? match[4]
      const latex = body.trim()
      if (!latex || latex.length > 10000) continue
      // Avoid common currency pairs, escaped dollars and partial $$ delimiters.
      if (match[4] !== undefined && (/^\s|\s$/.test(body) || /^\d+(?:[.,]\d+)?$/.test(latex) || /\d/.test(text[index + raw.length] ?? '') || text[index - 1] === '$' || text[index + raw.length] === '$' || body.includes('\\$'))) continue
      try { katex.renderToString(latex, { throwOnError: true, displayMode: display, strict: 'ignore', trust: false }) } catch { continue }
      results.push({ from: positions[index], to: positions[index + raw.length - 1] + 1, latex, display })
    }
  }
  function walk(parent: ProseMirrorNode, start: number) {
    let text = '', positions: number[] = []
    const flush = () => { if (text) scan(text, positions); text = ''; positions = [] }
    parent.forEach((node, offset) => {
      const pos = start + offset
      if (node.isTextblock && !node.type.spec.code) {
        if (node.type.name !== 'paragraph') flush()
        if (text) { text += '\n'; positions.push(pos) }
        node.forEach((child, childOffset) => {
          const at = pos + 1 + childOffset
          if (child.isText && !child.marks.some(mark => mark.type.name === 'code')) {
            text += child.text!
            for (let i = 0; i < child.text!.length; i++) positions.push(at + i)
          } else if (child.type.name === 'hardBreak') { text += '\n'; positions.push(at) }
          else { text += '\ufffc'; positions.push(at) }
        })
        // Only adjacent paragraphs may form a multiline display expression.
        if (node.type.name !== 'paragraph') flush()
      } else {
        flush()
        if (!node.isAtom && !node.type.spec.code) walk(node, pos + 1)
      }
    })
    flush()
  }
  walk(doc, 0)
  return results
}

export function activateLatex(tr: Transaction, candidates: LatexCandidate[]) {
  for (const candidate of [...candidates].sort((a, b) => b.from - a.from)) {
    const type = tr.doc.type.schema.nodes[candidate.display ? 'blockMath' : 'inlineMath']
    if (!type) continue
    const marks = candidate.display ? undefined : tr.doc.resolve(candidate.from).marks()
    tr.replaceRangeWith(candidate.from, candidate.to, type.create({ latex: candidate.latex }, null, marks))
  }
  return tr
}
