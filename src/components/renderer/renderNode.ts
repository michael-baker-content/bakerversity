import { isEditorLink, editorLinkAttributes } from '../../lib/editorLinks.mjs'
import { calloutDefinition } from '../../lib/callouts.mjs'
import { normalizeTextLanguage } from '../../lib/textLanguages.mjs'
import {collectFootnotes,footnoteSection,footnoteReference} from '../../lib/footnotes.mjs'
import { textImageVerticalAlign } from '../../lib/textImage.mjs'
import { renderDirectoryTree } from '../../lib/directoryTree.mjs'
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


// Renders a single non-graph TipTap node to an HTML string
export function renderNode(node: Record<string, unknown>, interactive?: (node: Record<string, unknown>) => string | undefined, footnotePrefix='lesson'): string {
  if(node.type==='doc'){
    const notes=collectFootnotes(node);let occurrence=0
    const prefix=footnotePrefix.replace(/[^a-zA-Z0-9_-]/g,'')||'lesson'
    const html=((node.content??[]) as Record<string,unknown>[]).map(child=>renderNode(child,item=>{
      if(item.type==='footnote'){const attrs=item.attrs as {id:string};const note=notes.find(note=>note.id===attrs.id);return note?footnoteReference(note.number,++occurrence,prefix):''}
      return interactive?.(item)
    })).join('')
    return html+footnoteSection(notes,(body:Record<string,unknown>)=>renderNode(body),prefix)
  }
  const replacement = interactive?.(node)
  if (replacement !== undefined) return replacement
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = content.map(child => renderNode(child, interactive)).join('')

  switch (type) {
    case 'slideshow': return '<section class="slideshow" data-slideshow>'+ (attrs.title?'<h3>'+escapeHtml(String(attrs.title))+'</h3>':'')+children+'</section>'
    case 'slideshowSlide': return '<section class="slideshow-slide" data-slideshow-slide>'+children+'</section>'
    case 'slideshowDescription': return '<div class="slide-description" data-slide-description>'+children+'</div>'
    case 'doc':       return children
    case 'textImage': return '<section data-text-image data-text-vertical-align="'+textImageVerticalAlign(attrs.textVerticalAlign)+'" class="text-image"><div class="text-image-grid">'+children+'</div></section>'
    case 'textImageBody': return '<div data-text-image-body class="text-image-body">'+children+'</div>'
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
      const s = calloutDefinition(calloutType)
      // children is the TipTap-managed content (paragraphs, math, etc.)
      return `<div data-callout="${escapeAttr(calloutType)}" style="border-left:4px solid ${s.border};background:${s.bg};border-radius:0 6px 6px 0;padding:0.875rem 1rem;margin:1rem 0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:14px;">${s.icon}</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${s.color};">${s.label}</span>
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
    case 'directoryTree': return renderDirectoryTree(attrs.source, attrs.title, attrs.copyFolders === true, attrs.color, attrs.collapsible === true)
    case 'image': {
      const maxWidth=imageMaxWidth(attrs.maxWidth)
      const aligned = attrs.alignment === 'center'
      const sizeStyle = ` style="width:fit-content;max-width:${maxWidth ? `min(100%, ${maxWidth}px)` : '100%'};margin-left:${aligned?'auto':'0'};margin-right:${aligned?'auto':'0'}"`
      const original = (attrs.src as string) ?? ''
      const delivery = imageDelivery(original)
      const attr = (value: string) => escapeAttr(escapeHtml(value))
      const width = Number(attrs.width), height = Number(attrs.height)
      const dimensions = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? ` width="${width}" height="${height}"` : ''
      const responsive = delivery.srcSet ? ` srcset="${attr(delivery.srcSet)}" sizes="${attr(delivery.sizes ?? '')}"` : ''
      const img = `<div class="lesson-image media-image"${sizeStyle} data-original-src="${attr(original)}"><img src="${attr(delivery.src)}"${responsive}${dimensions} alt="${attr((attrs.alt as string) ?? '')}" loading="lazy" decoding="async" /><div class="media-image-error" hidden><span>Image could not be loaded.</span> <button type="button">Retry image</button></div></div>`
      const caption = (attrs.title as string) ?? ''
      let credit = ''
      if (typeof attrs.creditName === 'string' && typeof attrs.creditUrl === 'string') {
        try {
          const url = new URL(attrs.creditUrl)
          if (url.protocol === 'https:' && url.hostname === 'unsplash.com' && !url.username && !url.password) {
            credit = `Photo by <a href="${attr(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attrs.creditName)}</a> on <a href="https://unsplash.com/?utm_source=bakerversity&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>`
          }
        } catch {}
      }
      return caption || credit ? `<figure${sizeStyle}>${img}<figcaption>${escapeHtml(caption)}${caption && credit ? '<br />' : ''}${credit}</figcaption></figure>` : img
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
        const textLanguage = mark.type === 'textLanguage' ? normalizeTextLanguage(mark.attrs?.language) : null
        if (textLanguage) {
          text = `<span lang="${textLanguage}">${text}</span>`
        }
        if (mark.type === 'bold')   text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'code')   text = `<code>${text}</code>`
        if (mark.type === 'link') {
          const href=String(mark.attrs?.href??'').trim()
          if(isEditorLink(href))text = '<a target="'+editorLinkAttributes.target+'" rel="'+editorLinkAttributes.rel+'" href="'+escapeAttr(escapeHtml(href))+'">'+text+'</a>'
        }
      }
      return text
    }
    case 'inlineMath':
      return `<span data-inline-math="${escapeAttr((attrs.latex as string) ?? '')}"></span>`
    case 'blockMath':
      return `<div data-block-math="${escapeAttr((attrs.latex as string) ?? '')}"></div>`
    default:
      return `<div role="note" class="unsupported-content">This content type is not supported yet.</div>${children}`
  }
}

/** Build one HTML tree, preserving wrappers while reserving client-rendered block positions. */
export function buildRenderPlan(document: Record<string, unknown>, prefix='lesson') {
  const islands: Record<string, unknown>[] = []
  const html = renderNode(document, node => {
    if (node.type !== 'mafsGraph' && node.type !== 'practiceQuiz' && node.type !== 'slideshow') return undefined
    const index = islands.push(node) - 1
    return '<div data-lesson-island="' + index + '" style="min-width:0"><p>Loading interactive content…</p></div>'
  },prefix)
  return { html, islands }
}
