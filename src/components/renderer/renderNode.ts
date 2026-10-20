import { imageMaxWidth } from '../../lib/imageWidth.mjs'
import { imageDelivery } from '../../lib/imageDelivery.mjs'
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
  warning: { icon: '⚠️', label: 'Warning',         border: 'var(--amber)',   bg: 'var(--amber-muted)',         labelColor: 'var(--amber-label)' },
  note:    { icon: '📝', label: 'Note',            border: 'var(--text-2)',  bg: 'var(--surface-2)',           labelColor: 'var(--text-2)' },
  objectives: { icon: '🎯', label: 'Objectives', border: 'var(--indigo)', bg: 'var(--indigo-muted)', labelColor: 'var(--indigo)' },
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
      const calloutType = (attrs.type as string) ?? 'tip'
      const s = CALLOUT_STYLES[calloutType] ?? CALLOUT_STYLES.tip
      // children is the TipTap-managed content (paragraphs, math, etc.)
      return `<div data-callout="${escapeAttr(calloutType)}" style="border-left:4px solid ${s.border};background:${s.bg};border-radius:0 6px 6px 0;padding:0.875rem 1rem;margin:1rem 0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:14px;">${s.icon}</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${s.labelColor};">${s.label}</span>
        </div>
        <div style="font-size:15px;line-height:1.65;color:var(--text);">${children}</div>
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
      const maxWidth=imageMaxWidth(attrs.maxWidth)
      const sizeStyle=maxWidth ? ` style="max-width:min(100%, ${maxWidth}px)"` : ''
      const original = (attrs.src as string) ?? ''
      const delivery = imageDelivery(original)
      const attr = (value: string) => escapeAttr(escapeHtml(value))
      const width = Number(attrs.width), height = Number(attrs.height)
      const dimensions = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? ` width="${width}" height="${height}"` : ''
      const responsive = delivery.srcSet ? ` srcset="${attr(delivery.srcSet)}" sizes="${attr(delivery.sizes ?? '')}"` : ''
      const img = `<div class="lesson-image media-image"${sizeStyle} data-original-src="${attr(original)}"><img src="${attr(delivery.src)}"${responsive}${dimensions} alt="${attr((attrs.alt as string) ?? '')}" loading="lazy" decoding="async" /><div class="media-image-error" hidden><span>Image could not be loaded.</span> <button type="button">Retry image</button></div></div>`
      const caption = (attrs.title as string) ?? ''
      return caption ? `<figure${sizeStyle}>${img}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : img
    }
    case 'practiceQuiz': {
      // Static placeholder in HTML output — interactive version handled by LessonRenderer
      const quizTitle = escapeHtml((attrs.title as string) ?? 'Practice Quiz')
      const questions = Array.isArray(attrs.questions) ? attrs.questions : []
      return `<div data-practice-quiz style="border:2px solid var(--indigo);border-radius:var(--radius-lg);padding:1rem;margin:1rem 0;">
        <p style="margin:0 0 0.5rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--indigo);">✦ Practice Quiz</p>
        <p style="margin:0;font-size:15px;font-weight:600;">${quizTitle}</p>
        <p style="margin:4px 0 0;font-size:13px;color:var(--text-3);">${questions.length} question${questions.length !== 1 ? 's' : ''}</p>
      </div>`
    }
    case 'table':     return `<div class="lesson-table"><p class="lesson-table-hint" hidden>Swipe or scroll sideways to see more.</p><div class="lesson-table-scroll"><table>${children}</table></div></div>`
    case 'tableRow':  return `<tr>${children}</tr>`
    case 'tableCell': return `<td>${children}</td>`
    case 'tableHeader': return `<th>${children}</th>`
    case 'horizontalRule': return '<hr>'
    case 'hardBreak':      return '<br>'
    case 'text': {
      const marks = (node.marks as { type: string; attrs?: Record<string, unknown> }[]) ?? []
      let text = escapeHtml((node.text as string) ?? '')
      for (const mark of marks) {
        if (mark.type === 'highlight') text = `<mark style="background-color:#fef08a;color:#1f2937">${text}</mark>`
        if (mark.type === 'textLanguage' && (mark.attrs?.language === 'en' || mark.attrs?.language === 'pl')) {
          text = `<span lang="${mark.attrs.language}">${text}</span>`
        }
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
