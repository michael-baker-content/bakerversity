import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'

// ── Types ─────────────────────────────────────────────────────────────────────

type TipTapNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

// Remark AST node types we handle
type MdastNode = {
  type: string
  value?: string
  identifier?: string
  footnote?: {id:string;body:TipTapNode}
  depth?: number
  ordered?: boolean
  lang?: string
  url?: string
  alt?: string
  children?: MdastNode[]
  data?: { math?: boolean }
}

// ── Security helpers ──────────────────────────────────────────────────────────

// Strip javascript: and data: URLs from links and images
function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return null
  return url
}

// ── Node converters ───────────────────────────────────────────────────────────

function convertInlineNodes(children: MdastNode[]): TipTapNode[] {
  const nodes: TipTapNode[] = []

  for (const child of children) {
    switch (child.type) {
      case 'footnoteReference':
        if(child.footnote)nodes.push({type:'footnote',attrs:child.footnote})
        break
      case 'text':
        if (child.value) nodes.push({ type: 'text', text: child.value })
        break

      case 'inlineMath':
        // $...$ — our custom TipTap node
        if (child.value) {
          nodes.push({ type: 'inlineMath', attrs: { latex: child.value } })
        }
        break

      case 'strong': {
        const inner = convertInlineNodes(child.children ?? [])
        inner.forEach((n) => {
          if (n.type === 'text') {
            n.marks = [...(n.marks ?? []), { type: 'bold' }]
          }
        })
        nodes.push(...inner)
        break
      }

      case 'emphasis': {
        const inner = convertInlineNodes(child.children ?? [])
        inner.forEach((n) => {
          if (n.type === 'text') {
            n.marks = [...(n.marks ?? []), { type: 'italic' }]
          }
        })
        nodes.push(...inner)
        break
      }

      case 'inlineCode':
        if (child.value) {
          nodes.push({ type: 'text', text: child.value, marks: [{ type: 'code' }] })
        }
        break

      case 'link': {
        const href = sanitizeUrl(child.url ?? '')
        if (href) {
          const inner = convertInlineNodes(child.children ?? [])
          inner.forEach((n) => {
            if (n.type === 'text') {
              n.marks = [...(n.marks ?? []), { type: 'link', attrs: { href } }]
            }
          })
          nodes.push(...inner)
        }
        break
      }

      case 'html':
        // Drop raw HTML entirely — security measure
        // Optionally could strip tags and keep text, but dropping is safer
        break

      default:
        // Unknown inline — recurse into children if any
        if (child.children) nodes.push(...convertInlineNodes(child.children))
        break
    }
  }

  return nodes
}

function convertBlockNode(node: MdastNode): TipTapNode | null {
  switch (node.type) {
    case 'paragraph': {
      const content = convertInlineNodes(node.children ?? [])
      if (content.length === 0) return null
      return { type: 'paragraph', content }
    }

    case 'heading': {
      const level = Math.min(Math.max(node.depth ?? 2, 1), 6)
      const content = convertInlineNodes(node.children ?? [])
      return { type: 'heading', attrs: { level }, content }
    }

    case 'math':
      // $$...$$ block math
      if (node.value) {
        return { type: 'blockMath', attrs: { latex: node.value } }
      }
      return null

    case 'code':
      // Fenced code block — language from fence info string
      return {
        type: 'codeBlock',
        attrs: { language: node.lang ?? 'plaintext' },
        content: [{ type: 'text', text: node.value ?? '' }],
      }

    case 'blockquote': {
      const content: TipTapNode[] = []
      for (const child of node.children ?? []) {
        const converted = convertBlockNode(child)
        if (converted) content.push(converted)
      }
      return { type: 'blockquote', content }
    }

    case 'list': {
      const listType = node.ordered ? 'orderedList' : 'bulletList'
      const items: TipTapNode[] = (node.children ?? []).map((item) => {
        const itemContent: TipTapNode[] = []
        for (const child of item.children ?? []) {
          const converted = convertBlockNode(child)
          if (converted) itemContent.push(converted)
        }
        return { type: 'listItem', content: itemContent }
      })
      return { type: listType, content: items }
    }

    case 'thematicBreak':
      return { type: 'horizontalRule' }

    case 'table': {
      const rows = ((node.children ?? []) as Record<string, unknown>[])
      const [headRow, ...bodyRows] = rows
      const toCell = (cell: Record<string, unknown>, isHeader: boolean): TipTapNode => {
        const cellChildren = (cell.children ?? []) as Record<string, unknown>[]
        const inline = convertInlineNodes(cellChildren as unknown as MdastNode[])
        return {
          type: isHeader ? 'tableHeader' : 'tableCell',
          content: [{ type: 'paragraph', content: inline }],
        }
      }
      const toRow = (row: Record<string, unknown>, isHeader: boolean): TipTapNode => ({
        type: 'tableRow',
        content: ((row.children ?? []) as Record<string, unknown>[]).map((cell) => toCell(cell, isHeader)),
      })
      return {
        type: 'table',
        content: [
          ...(headRow ? [toRow(headRow as Record<string, unknown>, true)] : []),
          ...((bodyRows ?? []) as Record<string, unknown>[]).map((row) => toRow(row, false)),
        ],
      }
    }

    case 'image': {
      const src = sanitizeUrl(node.url ?? '')
      if (!src) return null
      return { type: 'image', attrs: { src, alt: node.alt ?? '' } }
    }

    case 'html':
      // Drop raw HTML blocks entirely
      return null

    default:
      // Unknown block — try to recurse
      if (node.children) {
        const content: TipTapNode[] = []
        for (const child of node.children) {
          const converted = convertBlockNode(child)
          if (converted) content.push(converted)
        }
        if (content.length > 0) return { type: 'paragraph', content }
      }
      return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function markdownToTipTap(markdown: string): Record<string, unknown> {
  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)   // tables, strikethrough, task lists (we handle subset)
    .use(remarkMath)  // $...$ and $$...$$ math

  const tree = processor.parse(normalized)
  const definitions=new Map<string,{id:string;body:TipTapNode}>()
  const ast=tree.children as MdastNode[]
  for(const node of ast){
    if(node.type==='footnoteDefinition'&&node.identifier){
      const nestedReference=(item:MdastNode):boolean=>item.type==='footnoteReference'||(item.children??[]).some(nestedReference)
      if((node.children??[]).some(nestedReference))throw new Error('Footnotes cannot contain other footnote references.')
      definitions.set(node.identifier,{id:crypto.randomUUID(),body:{type:'doc',content:(node.children??[]).map(convertBlockNode).filter((node):node is TipTapNode=>!!node)}})
    }
  }
  function resolveNotes(node:MdastNode){
    if(node.type==='footnoteReference'){
      const definition=definitions.get(node.identifier??'')
      if(!definition)throw new Error('A footnote reference is missing its definition.')
      node.footnote=definition
    }
    node.children?.forEach(resolveNotes)
  }
  ast.forEach(resolveNotes)
  const content: TipTapNode[] = []

  for (const node of ast) {
    if(node.type==='footnoteDefinition')continue
    const converted = convertBlockNode(node)
    if (converted) content.push(converted)
  }

  // Ensure doc ends with a paragraph so cursor has somewhere to land
  const last = content[content.length - 1]
  if (!last || last.type !== 'paragraph') {
    content.push({ type: 'paragraph', content: [] })
  }

  return { type: 'doc', content }
}
