import { directoryTreeText } from './directoryTree.mjs'
function nodeToMd(node: Record<string, unknown>, indent = '', num?: number): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = () => content.map((n) => nodeToMd(n, indent)).join('')

  switch (type) {
    case 'textImage': return content.map(n=>nodeToMd(n)).join('\n')+'\n'
    case 'textImageBody': return children()
    case 'image': return '!['+String(attrs.alt??'').replace(/[\[\]\\]/g, character=>'\\'+character)+'](<'+String(attrs.src??'').replace(/>/g,'%3E')+'>)\n'+(attrs.title?String(attrs.title)+'\n':'')
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
    case 'directoryTree': {
      const text = directoryTreeText(attrs)
      const fence = '~'.repeat(Math.max(3,...Array.from(text.matchAll(/~+/g),m=>m[0].length+1)))
      return fence+'text\n'+text+'\n'+fence+'\n'
    }
    case 'terminalBlock': return `\`\`\`bash\n${attrs.content ?? ''}\n\`\`\`\n`
    case 'callout': {
      const label = String(attrs.type ?? 'note').toUpperCase()
      const body = content.length ? children() : String(attrs.content ?? '')
      return '> **'+label+'**\n'+body.trimEnd().split('\n').map(line=>'> '+line).join('\n')+'\n'
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

export function jsonToMarkdown(doc: Record<string, unknown>): string {
  return nodeToMd(doc).trim()
}

