'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { MafsGraphAttrs, GraphFunction } from './MafsGraph'

const MafsGraph = dynamic(() => import('./MafsGraph'), { ssr: false })

const COLOR_OPTIONS = [
  { label: 'Indigo', value: 'indigo' },
  { label: 'Blue', value: 'blue' },
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Pink', value: 'pink' },
  { label: 'Violet', value: 'violet' },
  { label: 'Black', value: 'black' },
]

const PRESETS: { label: string; attrs: Partial<MafsGraphAttrs> }[] = [
  { label: 'Linear', attrs: { functions: [{ expression: '2 * x + 1', color: 'indigo', label: 'y = 2x + 1' }], xMin: -5, xMax: 5, yMin: -10, yMax: 10 } },
  { label: 'Quadratic', attrs: { functions: [{ expression: 'x * x', color: 'indigo', label: 'y = x²' }], xMin: -5, xMax: 5, yMin: -2, yMax: 15 } },
  { label: 'Cubic', attrs: { functions: [{ expression: 'x * x * x', color: 'indigo', label: 'y = x³' }], xMin: -4, xMax: 4, yMin: -15, yMax: 15 } },
  { label: 'Sine', attrs: { functions: [{ expression: 'Math.sin(x)', color: 'indigo', label: 'y = sin(x)' }], xMin: -7, xMax: 7, yMin: -2, yMax: 2 } },
  { label: 'Cosine', attrs: { functions: [{ expression: 'Math.cos(x)', color: 'indigo', label: 'y = cos(x)' }], xMin: -7, xMax: 7, yMin: -2, yMax: 2 } },
  { label: 'Absolute value', attrs: { functions: [{ expression: 'Math.abs(x)', color: 'indigo', label: 'y = |x|' }], xMin: -6, xMax: 6, yMin: -1, yMax: 8 } },
  { label: 'Square root', attrs: { functions: [{ expression: 'Math.sqrt(x)', color: 'indigo', label: 'y = √x' }], xMin: -1, xMax: 10, yMin: -1, yMax: 4 } },
  { label: 'Exponential', attrs: { functions: [{ expression: 'Math.exp(x)', color: 'indigo', label: 'y = eˣ' }], xMin: -4, xMax: 3, yMin: -1, yMax: 12 } },
]

const DEFAULT_ATTRS: MafsGraphAttrs = {
  functions: [{ expression: 'x * x', color: 'indigo', label: 'y = x²' }],
  xMin: -5, xMax: 5, yMin: -3, yMax: 12,
  xStep: undefined, yStep: undefined,
  showGrid: true,
  label: '',
}

interface Props {
  initial?: MafsGraphAttrs
  onSave: (attrs: MafsGraphAttrs) => void
  onClose: () => void
}

export default function MafsGraphEditor({ initial, onSave, onClose }: Props) {
  const [attrs, setAttrs] = useState<MafsGraphAttrs>(initial ?? DEFAULT_ATTRS)

  const set = useCallback(<K extends keyof MafsGraphAttrs>(key: K, value: MafsGraphAttrs[K]) => {
    setAttrs((a) => ({ ...a, [key]: value }))
  }, [])

  const setFn = useCallback((i: number, key: keyof GraphFunction, value: string) => {
    setAttrs((a) => {
      const fns = [...a.functions]
      fns[i] = { ...fns[i], [key]: value }
      return { ...a, functions: fns }
    })
  }, [])

  const addFunction = () => {
    const colors = ['blue', 'red', 'green', 'orange', 'pink', 'violet']
    const color = colors[attrs.functions.length % colors.length]
    setAttrs((a) => ({ ...a, functions: [...a.functions, { expression: 'x', color, label: '' }] }))
  }

  const removeFunction = (i: number) => {
    setAttrs((a) => ({ ...a, functions: a.functions.filter((_, j) => j !== i) }))
  }

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setAttrs((a) => ({ ...a, ...preset.attrs }))
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 740,
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Graph editor</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-2)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Presets */}
          <div>
            <label style={labelStyle}>Presets</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <button type="button" key={p.label} onClick={() => applyPreset(p)} className="btn btn-ghost btn-sm">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Functions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Functions</label>
              {attrs.functions.length < 4 && (
                <button type="button" onClick={addFunction} className="btn btn-ghost btn-sm">+ Add function</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attrs.functions.map((fn, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 8, alignItems: 'end',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>
                      Expression (in terms of x)
                    </label>
                    <input
                      className="input"
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                      value={fn.expression}
                      onChange={(e) => setFn(i, 'expression', e.target.value)}
                      placeholder="e.g. x * x + 2 * x - 1"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Label (optional)</label>
                    <input
                      className="input"
                      style={{ fontSize: 13 }}
                      value={fn.label ?? ''}
                      onChange={(e) => setFn(i, 'label', e.target.value)}
                      placeholder="e.g. y = x²"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <select
                      className="input"
                      style={{ width: 90, fontSize: 12 }}
                      value={fn.color}
                      onChange={(e) => setFn(i, 'color', e.target.value)}
                    >
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {attrs.functions.length > 1 && (
                      <button type="button"
                        onClick={() => removeFunction(i)}
                        className="btn btn-sm"
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px 8px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
              Use standard JS: <code>Math.sin(x)</code>, <code>Math.sqrt(x)</code>, <code>Math.pow(x, 3)</code>, <code>Math.abs(x)</code>, <code>Math.PI</code>
            </p>
          </div>

          {/* Viewport */}
          <div>
            <label style={labelStyle}>Viewport</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => (
                <label key={key}>
                  <span style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{key}</span>
                  <input
                    className="input"
                    type="number"
                    value={attrs[key]}
                    onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Axis steps */}
          <div>
            <label style={labelStyle}>Axis label interval</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['xStep', 'yStep'] as const).map((key) => (
                <label key={key}>
                  <span style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>
                    {key === 'xStep' ? 'X axis' : 'Y axis'}
                  </span>
                  <select
                    className="input"
                    value={attrs[key] ?? ''}
                    onChange={(e) => set(key, e.target.value ? parseFloat(e.target.value) : undefined as unknown as number)}
                  >
                    <option value="">Auto</option>
                    {[0.25, 0.5, 1, 2, 5, 10, 25, 50, 100].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
              Auto selects a sensible interval based on the viewport range.
            </p>
          </div>

          {/* Options row */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={attrs.showGrid}
                onChange={(e) => set('showGrid', e.target.checked)}
              />
              Show grid and axes
            </label>
          </div>

          {/* Caption */}
          <div>
            <label style={labelStyle}>Caption <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>(optional, shown below graph)</span></label>
            <input
              className="input"
              value={attrs.label ?? ''}
              onChange={(e) => set('label', e.target.value)}
              placeholder="e.g. Graph of f(x) = x² on [-5, 5]"
            />
          </div>

          {/* Live preview */}
          <div>
            <label style={labelStyle}>Preview</label>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MafsGraph attrs={attrs} height={260} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" onClick={() => onSave(attrs)} className="btn btn-primary btn-sm">Insert graph</button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
}
