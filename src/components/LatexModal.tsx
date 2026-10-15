'use client'

import { useState, useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const LATEX_CATEGORIES = [
  {
    label: 'Arithmetic',
    formulas: [
      { label: 'Fraction', latex: '\\frac{a}{b}' },
      { label: 'Mixed number', latex: '2\\frac{1}{3}' },
      { label: 'Square root', latex: '\\sqrt{x}' },
      { label: 'Nth root', latex: '\\sqrt[n]{x}' },
      { label: 'Exponent', latex: 'x^{n}' },
      { label: 'Absolute value', latex: '|x|' },
      { label: 'Plus/minus', latex: '\\pm' },
      { label: 'Not equal', latex: '\\neq' },
      { label: 'Less than or equal', latex: '\\leq' },
      { label: 'Greater than or equal', latex: '\\geq' },
    ],
  },
  {
    label: 'Linear Equations',
    formulas: [
      { label: 'Slope formula', latex: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
      { label: 'Slope-intercept', latex: 'y = mx + b' },
      { label: 'Standard form', latex: 'Ax + By = C' },
      { label: 'Point-slope', latex: 'y - y_1 = m(x - x_1)' },
      { label: 'Solve for x', latex: 'x = \\frac{c - b}{a}' },
      { label: 'Proportionality', latex: '\\frac{a}{b} = \\frac{c}{d}' },
    ],
  },
  {
    label: 'Quadratics',
    formulas: [
      { label: 'Standard form', latex: 'ax^2 + bx + c = 0' },
      { label: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'Factored form', latex: 'a(x - r_1)(x - r_2)' },
      { label: 'Vertex form', latex: 'a(x - h)^2 + k' },
      { label: 'Discriminant', latex: 'b^2 - 4ac' },
      { label: 'Sum of roots', latex: 'r_1 + r_2 = -\\frac{b}{a}' },
      { label: 'Product of roots', latex: 'r_1 \\cdot r_2 = \\frac{c}{a}' },
    ],
  },
  {
    label: 'Systems',
    formulas: [
      { label: 'System notation', latex: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}' },
      { label: 'Substitution', latex: 'x = \\frac{c - by}{a}' },
      { label: 'Elimination step', latex: 'a_1 x + b_1 y = c_1' },
    ],
  },
  {
    label: 'Geometry',
    formulas: [
      { label: 'Pythagorean theorem', latex: 'a^2 + b^2 = c^2' },
      { label: 'Distance formula', latex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}' },
      { label: 'Midpoint formula', latex: '\\left(\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}\\right)' },
      { label: 'Area of rectangle', latex: 'A = lw' },
      { label: 'Area of triangle', latex: 'A = \\frac{1}{2}bh' },
      { label: 'Area of circle', latex: 'A = \\pi r^2' },
      { label: 'Circumference', latex: 'C = 2\\pi r' },
      { label: 'Perimeter', latex: 'P = 2l + 2w' },
    ],
  },
]

export { LATEX_CATEGORIES }

function renderLatex(latex: string, displayMode: boolean): string {
  try { return katex.renderToString(latex, { throwOnError: false, displayMode }) }
  catch { return latex }
}

export default function LatexModal({
  onInsert,
  onClose,
  showDisplayToggle = false,
  initialLatex = '',
  initialDisplayMode = false,
}: {
  onInsert: (latex: string, displayMode: boolean) => void
  onClose: () => void
  showDisplayToggle?: boolean
  initialLatex?: string
  initialDisplayMode?: boolean
}) {
  const [activeCategory, setActiveCategory] = useState(0)
  const [displayMode, setDisplayMode] = useState(initialDisplayMode)
  const [editableLatex, setEditableLatex] = useState(initialLatex)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Update preview whenever editableLatex or displayMode changes
  useEffect(() => {
    if (!editableLatex.trim()) {
      setPreviewHtml('')
      setPreviewError('')
      return
    }
    try {
      const html = katex.renderToString(editableLatex, { throwOnError: true, displayMode })
      setPreviewHtml(html)
      setPreviewError('')
    } catch (e) {
      setPreviewHtml('')
      setPreviewError((e as Error).message.replace(/KaTeX parse error: /, ''))
    }
  }, [editableLatex, displayMode])

  function selectFormula(latex: string) {
    setEditableLatex(latex)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleInsert() {
    if (!editableLatex.trim()) return
    onInsert(editableLatex.trim(), displayMode)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Insert formula</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-2)', lineHeight: 1 }}>×</button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {LATEX_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveCategory(i)}
              style={{
                padding: '8px 14px', fontSize: 13, border: 'none', background: 'none',
                borderBottom: `2px solid ${activeCategory === i ? 'var(--indigo)' : 'transparent'}`,
                fontWeight: activeCategory === i ? 600 : 400,
                color: activeCategory === i ? 'var(--text)' : 'var(--text-2)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Formula grid — click to load into editor */}
        <div style={{
          padding: '0.75rem',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          flexShrink: 1,
        }}>
          {LATEX_CATEGORIES[activeCategory].formulas.map((f, i) => {
            const rendered = renderLatex(f.latex, false)
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectFormula(f.latex)}
                style={{
                  padding: '8px 10px',
                  border: `1px solid ${editableLatex === f.latex ? 'var(--indigo)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  background: editableLatex === f.latex ? 'var(--indigo-muted, var(--surface-2))' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</span>
                <span dangerouslySetInnerHTML={{ __html: rendered }} />
              </button>
            )
          })}
        </div>

        {/* Edit + preview area */}
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
            Edit LaTeX
          </label>
          <textarea
            ref={inputRef}
            value={editableLatex}
            onChange={(e) => setEditableLatex(e.target.value)}
            placeholder="Select a formula above or type LaTeX directly…"
            rows={2}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleInsert()
              }
            }}
          />

          {/* Live preview */}
          {previewError ? (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)', fontFamily: 'monospace' }}>
              {previewError}
            </div>
          ) : previewHtml ? (
            <div
              style={{ marginTop: 6, padding: '6px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: 32, textAlign: displayMode ? 'center' : 'left' }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          {showDisplayToggle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Insert as:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="lm-displayMode" checked={!displayMode} onChange={() => setDisplayMode(false)} />
                Inline
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="lm-displayMode" checked={displayMode} onChange={() => setDisplayMode(true)} />
                Block
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!editableLatex.trim() || !!previewError}
              className="btn btn-primary btn-sm"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
