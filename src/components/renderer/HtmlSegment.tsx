'use client'

import { useEffect, useRef, useId, useState, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import katex from 'katex'
import { createCodeHighlighter } from '@/lib/codeHighlighting'
import { hastToHtml } from './renderNode'

const lowlight = createCodeHighlighter()

export function HtmlSegment({ html, islands = [] }: { html: string; islands?: ReactNode[] }) {
  // React compares this object by identity. Replacing it on the portal-target
  // state update resets innerHTML and detaches the nodes receiving the portals.
  const htmlContent = useMemo(() => ({ __html: html }), [html])
  const ref = useRef<HTMLDivElement>(null)
  const tableId = useId()
  const [targets, setTargets] = useState<HTMLElement[]>([])
  useEffect(() => {
    const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-lesson-island]') ?? [])
    elements.forEach(element => element.replaceChildren())
    setTargets(elements)
  }, [html])

  useEffect(() => {
    if (!ref.current) return

    // KaTeX rendering
    ref.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      const latex = el.getAttribute('data-inline-math') ?? ''
      let target = el.querySelector<HTMLElement>('.katex-render-target')
      if (!target) {
        target = document.createElement('span')
        target.className = 'katex-render-target'
        el.innerHTML = ''
        el.appendChild(target)
      }
      try { katex.render(latex, target, { throwOnError: false, displayMode: false }) }
      catch { target.textContent = latex }
    })
    ref.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      const latex = el.getAttribute('data-block-math') ?? ''
      let target = el.querySelector<HTMLElement>('.katex-render-target')
      if (!target) {
        target = document.createElement('span')
        target.className = 'katex-render-target'
        el.innerHTML = ''
        el.appendChild(target)
      }
      try { katex.render(latex, target, { throwOnError: false, displayMode: true }) }
      catch { target.textContent = latex }
    })

    // Syntax highlighting + line numbers
    ref.current.querySelectorAll<HTMLPreElement>('pre[data-lang]').forEach((pre) => {
      const code = pre.querySelector('code')
      if (!code) return
      const lang      = pre.dataset.lang ?? ''
      const startLine = parseInt(pre.dataset.startLine ?? '1', 10) || 1
      const rawText   = code.textContent ?? ''

      let highlightedHtml = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (lang && lang !== 'plaintext') {
        try {
          const tree = lowlight.highlight(lang, rawText) as { type: string; children?: unknown[] }
          highlightedHtml = hastToHtml(tree)
        } catch { /* fallback to plain */ }
      }

      const lines = highlightedHtml.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()

      code.innerHTML = lines.map((line, i) => {
        const lineNum = startLine + i
        return `<span class="code-line"><span class="code-line-num">${lineNum}</span><span class="code-line-content">${line || ' '}</span></span>`
      }).join('')
      code.classList.add('with-line-numbers')
    })
  }, [html])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const tables = Array.from(root.querySelectorAll<HTMLElement>('.lesson-table')).map((wrapper, index) => {
      const scroller = wrapper.querySelector<HTMLElement>(':scope > .lesson-table-scroll')
      const table = scroller?.querySelector('table')
      const hint = wrapper.querySelector<HTMLElement>(':scope > .lesson-table-hint')
      if (!scroller || !table || !hint) return null
      hint.id = `${tableId}-table-hint-${index}`
      return { scroller, table, hint }
    }).filter(entry => entry !== null)

    const measure = () => {
      for (const { scroller, hint } of tables) {
        const overflowing = scroller.scrollWidth > scroller.clientWidth + 1
        hint.hidden = !overflowing
        if (overflowing) {
          scroller.tabIndex = 0
          scroller.setAttribute('role', 'region')
          scroller.setAttribute('aria-label', 'Scrollable table')
          scroller.setAttribute('aria-describedby', hint.id)
        } else {
          scroller.removeAttribute('tabindex')
          scroller.removeAttribute('role')
          scroller.removeAttribute('aria-label')
          scroller.removeAttribute('aria-describedby')
        }
      }
    }
    // Observe both widths: fonts, images, math and viewport changes can affect overflow.
    const observer = new ResizeObserver(measure)
    for (const { scroller, table } of tables) {
      observer.observe(scroller)
      observer.observe(table)
    }
    measure()
      return () => observer.disconnect()
  }, [html, tableId])

  useEffect(() => {
    const cleanups: (() => void)[] = []
    ref.current?.querySelectorAll<HTMLElement>('.lesson-image').forEach(wrapper => {
      const img = wrapper.querySelector('img')
      const error = wrapper.querySelector<HTMLElement>('.media-image-error')
      const retry = error?.querySelector('button')
      if (!img || !error || !retry) return
      let usedOriginal = false
      const loaded = () => { wrapper.dataset.state = 'loaded'; error.hidden = true; img.hidden = false }
      const failed = () => {
        const original = wrapper.dataset.originalSrc
        if (!usedOriginal && original && img.getAttribute('src') !== original) {
          usedOriginal = true
          img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = original
          return
        }
        wrapper.dataset.state = 'error'; error.hidden = false; img.hidden = true
      }
      const reload = () => {
        wrapper.dataset.state = 'loading'; error.hidden = true; img.hidden = false
        img.src = wrapper.dataset.originalSrc ?? img.src
      }
      wrapper.dataset.state = 'loading'
      img.addEventListener('load', loaded); img.addEventListener('error', failed)
      retry.addEventListener('click', reload)
      if (img.complete) { if (img.naturalWidth) loaded(); else failed() }
      cleanups.push(() => { img.removeEventListener('load', loaded); img.removeEventListener('error', failed); retry.removeEventListener('click', reload) })
    })
    return () => cleanups.forEach(cleanup => cleanup())
  }, [html])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const copy = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-directory-copy]')
      if (!button || !root.contains(button)) return
      event.preventDefault()
      const status = button.closest('.directory-tree')?.querySelector('[role="status"]')
      try {
        await navigator.clipboard.writeText(button.dataset.directoryCopy ?? '')
        if (status) status.textContent = 'Copied.'
      } catch {
        if (status) status.textContent = 'Copy unavailable. Select the text and copy it manually.'
      }
    }
    root.addEventListener('click', copy)
    return () => root.removeEventListener('click', copy)
  }, [html])

  return (
    <>
    <div
      ref={ref}
      dangerouslySetInnerHTML={htmlContent}
      className="lesson-content"
      style={{ fontSize: 16, lineHeight: 1.75 }}
    />
    {targets.map(target => createPortal(islands[Number(target.dataset.lessonIsland)] ?? null, target, target.dataset.lessonIsland))}
    </>
  )
}
