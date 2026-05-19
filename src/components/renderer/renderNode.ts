// Pure functions — no React imports needed

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str: string) {
  return str.replace(/"/g, '&quot;')
}

// Converts a lowlight hast node tree to an HTML string
export function hastToHtml(node: {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: unknown[]
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (node.type === 'text') return esc(node.value ?? '')
  if (node.type === 'element') {
    const tag = node.tagName ?? 'span'
    const cls = node.properties?.className
    const classAttr = Array.isArray(cls) && cls.length ? ` class="${cls.join(' ')}"` : ''
    const children = (node.children ?? []).map((c) => hastToHtml(c as typeof node)).join('')
    return `<${tag}${classAttr}>${children}</${tag}>`
  }
  if (node.type === 'root') {
    return (node.children ?? []).map((c) => hastToHtml(c as typeof node)).join('')
  }
  return ''
}

const CALLOUT_STYLES: Record<string, {
  icon: string; label: string; border: string; bg: string; labelColor: string
}> = {
  tip:     { icon: '💡', label: 'Tip',             border: 'var(--success)', bg: 'var(--success-bg)',         labelColor: 'var(--success)' },
  info:    { icon: 'ℹ️', label: 'Did you know?',   border: 'var(--indigo)',  bg: 'var(--indigo-muted)',        labelColor: 'var(--indigo)' },
  warning: { icon: '⚠️', label: 'Warning',         border: 'var(--amber)',   bg: 'var(--amber-muted)',         labelColor: 'var(--amber)' },
  note:    { icon: '📝', label: 'Note',            border: 'var(--text-2)',  bg: 'var(--surface-2)',           labelColor: 'var(--text-2)' },
  reading: { icon: '📚', label: 'Further reading', border: 'var(--indigo)',  bg: 'var(--indigo-muted)',        labelColor: 'var(--indigo)' },
  alert:   { icon: '🚨', label: 'Alert',           border: 'var(--danger)',  bg: 'var(--danger-bg, #fee2e2)', labelColor: 'var(--danger)' },
}

// Renders a single non-graph TipTap node to an HTML string
export function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = content.map(renderNode).join('')

  switch (type) {
    case 'doc':       return children
    case 'paragraph': return `<p>${children || '<br>'}</p>`
    case 'heading': {
      const level = (attrs.level as number) ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':  return `<ul>${children}</ul>`
    case 'orderedList': return `<ol>${children}</ol>`
    case 'listItem':    return `<li>${children}</li>`
    case 'blockquote':  return `<blockquote>${children}</blockquote>`
    case 'codeBlock': {
      const lang      = (attrs.language as string) ?? ''
      const startLine = (attrs.startLine as number) ?? 1
      const filename  = (attrs.filename as string) ?? ''
      const header = filename
        ? `<div class="code-block-header"><span class="code-filename">${escapeHtml(filename)}</span>${lang && lang !== 'plaintext' ? `<span class="code-lang-label">${escapeHtml(lang)}</span>` : ''}</div>`
        : lang && lang !== 'plaintext'
          ? `<div class="code-block-header"><span class="code-lang-label">${escapeHtml(lang)}</span></div>`
          : ''
      return `<pre data-lang="${escapeAttr(lang)}" data-start-line="${startLine}">${header}<code class="language-${lang}">${children}</code></pre>`
    }
    case 'callout': {
      const calloutType    = (attrs.type as string) ?? 'tip'
      const calloutContent = (attrs.content as string) ?? ''
      const s = CALLOUT_STYLES[calloutType] ?? CALLOUT_STYLES.tip
      return `<div data-callout="${escapeAttr(calloutType)}" style="border-left:4px solid ${s.border};background:${s.bg};border-radius:0 6px 6px 0;padding:0.875rem 1rem;margin:1rem 0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:14px;">${s.icon}</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${s.labelColor};">${s.label}</span>
        </div>
        <div style="font-size:15px;line-height:1.65;color:var(--text);">${calloutContent}</div>
      </div>`
    }
    case 'terminalBlock': {
      const termContent = escapeHtml((attrs.content as string) ?? '')
      return `<div data-terminal style="background:#0d1117;color:#e6edf3;border-radius:8px;padding:12px 16px;margin:0.75rem 0;border:1px solid var(--code-border);overflow-x:auto;">
        <div style="display:flex;gap:6px;margin-bottom:8px;opacity:0.6;">
          <span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span>
        </div>
        <pre data-terminal-pre style="margin:0;color:#e6edf3;font-family:monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${termContent}</pre>
      </div>`
    }
    case 'image': {
      const src = escapeAttr((attrs.src as string) ?? '')
      const alt = escapeAttr((attrs.alt as string) ?? '')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;margin:0.5rem 0;display:block;" />`
    }
    case 'horizontalRule': return '<hr>'
    case 'hardBreak':      return '<br>'
    case 'text': {
      const marks = (node.marks as { type: string; attrs?: Record<string, unknown> }[]) ?? []
      let text = escapeHtml((node.text as string) ?? '')
      for (const mark of marks) {
        if (mark.type === 'bold')   text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'code')   text = `<code>${text}</code>`
        if (mark.type === 'link')   text = `<a href="${mark.attrs?.href}">${text}</a>`
      }
      return text
    }
    case 'inlineMath':
      return `<span data-inline-math="${escapeAttr((attrs.latex as string) ?? '')}"></span>`
    case 'blockMath':
      return `<div data-block-math="${escapeAttr((attrs.latex as string) ?? '')}"></div>`
    default:
      return children
  }
}
