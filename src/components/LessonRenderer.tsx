'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import type { MafsGraphAttrs } from './MafsGraph'

const MafsGraph = dynamic(() => import('./MafsGraph'), { ssr: false })

interface LessonRendererProps {
  content: Record<string, unknown>
}

type Segment =
  | { type: 'html'; html: string }
  | { type: 'graph'; attrs: MafsGraphAttrs }

// Renders a single non-graph TipTap node to HTML string
function renderNode(node: Record<string, unknown>): string {
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
    case 'bulletList':    return `<ul>${children}</ul>`
    case 'orderedList':   return `<ol>${children}</ol>`
    case 'listItem':      return `<li>${children}</li>`
    case 'blockquote':    return `<blockquote>${children}</blockquote>`
    case 'codeBlock': {
      const lang = (attrs.language as string) ?? ''
      const label = lang && lang !== 'plaintext' ? `<div style="font-size:10px;color:#858585;padding:6px 1rem 0;font-family:monospace;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(lang)}</div>` : ''
      return `<pre>${label}<code class="language-${lang}">${children}</code></pre>`
    }
    case 'terminalBlock': {
      const content = escapeHtml((attrs.content as string) ?? '')
      return `<div data-terminal style="background:#0d1117;border-radius:8px;padding:12px 16px;margin:0.75rem 0;border:1px solid #30363d;overflow-x:auto;">
        <div style="display:flex;gap:6px;margin-bottom:8px;opacity:0.6;">
          <span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span>
        </div>
        <pre style="margin:0;color:#e6edf3;font-family:monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${content}</pre>
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

// Split top-level doc nodes into HTML segments and graph segments
function buildSegments(content: Record<string, unknown>): Segment[] {
  const topNodes = (content.content as Record<string, unknown>[] | undefined) ?? []
  const segments: Segment[] = []
  let currentHtml = ''

  for (const node of topNodes) {
    if ((node.type as string) === 'mafsGraph') {
      if (currentHtml) {
        segments.push({ type: 'html', html: currentHtml })
        currentHtml = ''
      }
      segments.push({ type: 'graph', attrs: node.attrs as unknown as MafsGraphAttrs })
    } else {
      currentHtml += renderNode(node)
    }
  }

  if (currentHtml) segments.push({ type: 'html', html: currentHtml })
  return segments
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str: string) {
  return str.replace(/"/g, '&quot;')
}

// HTML segment — handles KaTeX rendering via useEffect
function HtmlSegment({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      try { katex.render(el.dataset.inlineMath ?? '', el, { throwOnError: false, displayMode: false }) }
      catch { /* ignore */ }
    })
    ref.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      try { katex.render(el.dataset.blockMath ?? '', el, { throwOnError: false, displayMode: true }) }
      catch { /* ignore */ }
    })
  }, [html])

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: 16, lineHeight: 1.75 }}
    />
  )
}

export default function LessonRenderer({ content }: LessonRendererProps) {
  const segments = buildSegments(content)

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'graph' ? (
          <MafsGraph key={i} attrs={seg.attrs} />
        ) : (
          <HtmlSegment key={i} html={seg.html} />
        )
      )}
      <style>{`
        .lesson-content p { margin: 0 0 1rem; }
        .lesson-content h2 { font-size: 1.5rem; margin: 2rem 0 0.75rem; }
        .lesson-content h3 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
        .lesson-content ul, .lesson-content ol { padding-left: 1.5rem; margin: 0 0 1rem; }
        .lesson-content li { margin-bottom: 0.25rem; }
        .lesson-content blockquote { border-left: 3px solid var(--border); padding-left: 1rem; color: var(--text-2); margin: 1rem 0; }
        .lesson-content pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; font-size: 14px; }
        .lesson-content code { background: var(--surface-2); padding: 2px 5px; border-radius: 3px; font-size: 14px; }
        .lesson-content pre code { background: none; padding: 0; }
        .lesson-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
        .lesson-content a { color: var(--indigo); text-decoration: underline; }
        .lesson-content [data-block-math] { text-align: center; margin: 1.5rem 0; }
        .lesson-content [data-inline-math] { display: inline; }
      `}</style>
    </>
  )
}
