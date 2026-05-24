'use client'

import React, { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import katex from 'katex'
import MafsGraph from '@/components/MafsGraph'
import type { MafsGraphAttrs } from '@/components/MafsGraph'
import { CALLOUT_TYPES } from './constants'
import type { PracticeQuizQuestion } from './nodes'

// ── Inline math node view ─────────────────────────────────────────────────────
export function InlineMathNodeView({ node, selected, getPos, editor }: {
  node: { attrs: { latex: string } }
  selected: boolean
  getPos: () => number | undefined
  editor: import('@tiptap/react').Editor
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try { katex.render(node.attrs.latex, ref.current, { throwOnError: false, displayMode: false }) }
    catch { if (ref.current) ref.current.textContent = node.attrs.latex }
  }, [node.attrs.latex])

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          cursor: 'pointer', borderRadius: 3,
          outline: selected ? '2px solid var(--amber)' : 'none',
          outlineOffset: 1,
        }}
        title="Double-click to edit formula"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const pos = getPos()
          if (pos != null) {
            editor.commands.setMeta('editingLatex', { latex: node.attrs.latex, displayMode: false, pos })
          }
        }}
      >
        <span ref={ref} />
        {selected && (
          <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, padding: '0 2px' }}>✎</span>
        )}
      </span>
    </NodeViewWrapper>
  )
}

// ── Block math node view ──────────────────────────────────────────────────────
export function BlockMathNodeView({ node, selected, getPos, editor }: {
  node: { attrs: { latex: string } }
  selected: boolean
  getPos: () => number | undefined
  editor: import('@tiptap/react').Editor
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try { katex.render(node.attrs.latex, ref.current, { throwOnError: false, displayMode: true }) }
    catch { if (ref.current) ref.current.textContent = node.attrs.latex }
  }, [node.attrs.latex])

  return (
    <NodeViewWrapper>
      <div
        style={{
          textAlign: 'center', margin: '1rem 0', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 4,
          outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
          position: 'relative',
        }}
        title="Double-click to edit formula"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const pos = getPos()
          if (pos != null) {
            editor.commands.setMeta('editingLatex', { latex: node.attrs.latex, displayMode: true, pos })
          }
        }}
      >
        <span ref={ref} />
        {selected && (
          <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>✎ edit</span>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ── Mafs graph node view ───────────────────────────────────────────────────────
export function MafsGraphNodeView({ node, selected }: {
  node: { attrs: Record<string, unknown> }
  selected: boolean
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
}) {
  const attrs = node.attrs as unknown as MafsGraphAttrs
  return (
    <NodeViewWrapper>
      <div style={{
        outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
        borderRadius: 'var(--radius-lg)',
        transition: 'outline 0.1s',
      }}>
        <MafsGraph attrs={attrs} />
      </div>
    </NodeViewWrapper>
  )
}

// ── Terminal node view ─────────────────────────────────────────────────────────
export function TerminalNodeView({ node, selected }: {
  node: { attrs: { prompt: string; content: string } }
  selected: boolean
  updateAttributes: (a: Record<string, unknown>) => void
}) {
  return (
    <NodeViewWrapper>
      <div style={{
        background: '#0d1117',
        color: '#e6edf3',
        borderRadius: 8,
        padding: '12px 16px',
        margin: '0.75rem 0',
        fontFamily: "'Fira Mono', 'Cascadia Code', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        outline: selected ? '3px solid var(--amber)' : 'none',
        border: '1px solid var(--code-border)',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
        </div>
        <pre data-terminal-pre style={{ margin: 0, color: '#e6edf3', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'none', border: 'none', padding: 0 }}>
          {node.attrs.content}
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

// ── Callout node view ──────────────────────────────────────────────────────────
export function CalloutNodeView({ node, updateAttributes, selected }: {
  node: { attrs: { type: string } }
  updateAttributes: (a: Record<string, unknown>) => void
  selected: boolean
}) {
  const t = CALLOUT_TYPES.find((c) => c.value === node.attrs.type) ?? CALLOUT_TYPES[0]

  return (
    <NodeViewWrapper>
      <div style={{
        borderLeft: `4px solid ${t.color}`,
        background: t.bg,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '0.875rem 1rem',
        margin: '1rem 0',
        outline: selected ? `2px solid ${t.color}` : 'none',
        outlineOffset: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.color }}>{t.label}</span>
          <select
            value={node.attrs.type}
            onChange={(e) => updateAttributes({ type: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer' }}
          >
            {CALLOUT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <NodeViewContent style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', minHeight: '1.5em' }} />
      </div>
    </NodeViewWrapper>
  )
}

// ── LatexInput ────────────────────────────────────────────────────────────────
// A plain text input that renders a KaTeX preview below it whenever the value
// contains $...$ or $$...$$ expressions. Used in practice quiz fields and the
// assessment question editor so instructors can write math without a full editor.
//
// Usage is identical to a regular <input> — just swap in <LatexInput>.

interface LatexInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  style?: React.CSSProperties
  className?: string
  // Called on every mousedown so parent can stopPropagation to prevent
  // TipTap stealing focus from inside atom NodeViews.
  onMouseDown?: (e: React.MouseEvent) => void
}

function renderLatexPreview(text: string): string | null {
  if (!text.includes('$')) return null

  // Replace $$...$$ (display) and $...$ (inline) with KaTeX HTML
  let result = ''
  let i = 0
  let hasAny = false

  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end !== -1) {
        const latex = text.slice(i + 2, end).trim()
        try {
          result += katex.renderToString(latex, { throwOnError: false, displayMode: true })
          hasAny = true
        } catch {
          result += `$$${latex}$$`
        }
        i = end + 2
        continue
      }
    }
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end !== -1 && end > i + 1) {
        const latex = text.slice(i + 1, end).trim()
        try {
          result += katex.renderToString(latex, { throwOnError: false, displayMode: false })
          hasAny = true
        } catch {
          result += `$${latex}$`
        }
        i = end + 1
        continue
      }
    }
    // Escape HTML for plain text segments
    const ch = text[i]
    result += ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch
    i++
  }

  return hasAny ? result : null
}

export function LatexInput({ value, onChange, placeholder, style, className, onMouseDown }: LatexInputProps) {
  const preview = renderLatexPreview(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        className={className ?? 'input'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown?.(e) }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
      {preview && (
        <div
          style={{
            padding: '4px 10px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text)',
          }}
          // Safe: KaTeX output only, never user-supplied HTML
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
    </div>
  )
}

// ── Practice quiz node view ────────────────────────────────────────────────────

type QuizMode = 'editing' | 'previewing'

function emptyQuestion(): PracticeQuizQuestion {
  return {
    id: Math.random().toString(36).slice(2),
    question_type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
    accepted_answers: null,
    explanation: null,
  }
}

// Stops TipTap from intercepting events on all interactive elements inside
// an atom NodeView. Pass this as onMouseDown to any input, button, select,
// or textarea inside PracticeQuizNodeView.
function stop(e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) {
  e.stopPropagation()
}

export function PracticeQuizNodeView({ node, updateAttributes, selected, deleteNode }: {
  node: { attrs: { title: string; questions: PracticeQuizQuestion[] } }
  updateAttributes: (a: Record<string, unknown>) => void
  selected: boolean
  deleteNode: () => void
}) {
  const [mode, setMode] = useState<QuizMode>('editing')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draftQ, setDraftQ] = useState<PracticeQuizQuestion | null>(null)

  // Preview state
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const questions: PracticeQuizQuestion[] = Array.isArray(node.attrs.questions) ? node.attrs.questions : []
  const title = node.attrs.title ?? 'Practice Quiz'

  // ── Question editing helpers ──────────────────────────────────────────────

  const startEdit = (idx: number) => {
    setDraftQ({ ...questions[idx] })
    setEditingIdx(idx)
  }

  const startAdd = () => {
    setDraftQ(emptyQuestion())
    setEditingIdx(questions.length)
  }

  const saveQuestion = () => {
    if (!draftQ) return
    const next = [...questions]
    if (editingIdx === questions.length) {
      next.push(draftQ)
    } else {
      next[editingIdx!] = draftQ
    }
    updateAttributes({ questions: next })
    setDraftQ(null)
    setEditingIdx(null)
  }

  const deleteQuestion = (idx: number) => {
    const next = questions.filter((_, i) => i !== idx)
    updateAttributes({ questions: next })
    if (editingIdx === idx) { setDraftQ(null); setEditingIdx(null) }
  }

  const setDraftField = <K extends keyof PracticeQuizQuestion>(key: K, val: PracticeQuizQuestion[K]) =>
    setDraftQ((q) => q ? { ...q, [key]: val } : q)

  const setDraftOption = (i: number, val: string) => {
    if (!draftQ?.options) return
    const opts = [...draftQ.options]
    opts[i] = val
    setDraftField('options', opts)
  }

  // ── Preview helpers ───────────────────────────────────────────────────────

  const handleSubmitPreview = () => setSubmitted(true)
  const handleRetryPreview = () => { setAnswers({}); setSubmitted(false) }

  const isCorrect = (q: PracticeQuizQuestion, given: string): boolean => {
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      return given === q.correct_answer
    }
    if (q.question_type === 'short_answer') {
      const norm = given.trim().toLowerCase()
      return (q.accepted_answers ?? [q.correct_answer]).some(
        (a) => a.trim().toLowerCase() === norm
      )
    }
    return false
  }

  const containerStyle: React.CSSProperties = {
    border: `2px solid ${selected ? 'var(--amber)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    margin: '1rem 0',
    background: 'var(--surface)',
    transition: 'border-color 0.15s',
  }

  const headerStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  }

  return (
    <NodeViewWrapper>
      <div style={containerStyle} contentEditable={false}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            ✦ Practice Quiz
          </span>
          <input
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            onMouseDown={stop}
            onClick={stop}
            onKeyDown={stop}
            onKeyUp={stop}
            onFocus={stop}
            style={{ flex: 1, minWidth: 120, fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', cursor: 'text' }}
            placeholder="Quiz title…"
          />
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onMouseDown={stop}
              onClick={(e) => { stop(e); setMode(mode === 'editing' ? 'previewing' : 'editing'); setSubmitted(false); setAnswers({}) }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: mode === 'previewing' ? 'var(--indigo-muted)' : 'var(--surface)', color: mode === 'previewing' ? 'var(--indigo)' : 'var(--text-3)', cursor: 'pointer' }}
            >
              {mode === 'editing' ? '▶ Preview' : '✎ Edit'}
            </button>
            <button
              onMouseDown={stop}
              onClick={(e) => { stop(e); deleteNode() }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Edit mode */}
        {mode === 'editing' && (
          <div style={{ padding: '0.875rem 1rem' }}>
            {questions.length === 0 && !draftQ && (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 0.75rem' }}>
                No questions yet. Add one below.
              </p>
            )}

            {/* Question list */}
            {questions.map((q, idx) => (
              <div key={q.id} style={{ padding: '0.5rem 0.75rem', marginBottom: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'flex-start', gap: 8, background: editingIdx === idx ? 'var(--indigo-muted)' : 'var(--surface)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 18, paddingTop: 2 }}>{idx + 1}.</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.question_text || <em style={{ color: 'var(--text-3)' }}>(no text)</em>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{q.question_type.replace('_', ' ')}</p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onMouseDown={stop} onClick={(e) => { stop(e); startEdit(idx) }} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>Edit</button>
                  <button onMouseDown={stop} onClick={(e) => { stop(e); deleteQuestion(idx) }} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
                </div>
              </div>
            ))}

            {/* Question editor */}
            {draftQ && (
              <div style={{ border: '1px solid var(--indigo)', borderRadius: 'var(--radius)', padding: '0.875rem', marginBottom: '0.75rem', background: 'var(--surface)' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: 12, fontWeight: 700, color: 'var(--indigo)' }}>
                  {editingIdx === questions.length ? 'New question' : `Question ${editingIdx! + 1}`}
                </p>

                {/* Type */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={qs}>Type</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(['multiple_choice', 'true_false', 'short_answer'] as const).map((t) => (
                      <button
                        key={t}
                        onMouseDown={stop}
                        onClick={(e) => {
                          stop(e)
                          setDraftField('question_type', t)
                          if (t === 'true_false') setDraftField('correct_answer', 'true')
                          else if (t === 'multiple_choice') setDraftField('correct_answer', '0')
                          else setDraftField('correct_answer', '')
                        }}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${draftQ.question_type === t ? 'var(--indigo)' : 'var(--border)'}`, background: draftQ.question_type === t ? 'var(--indigo-muted)' : 'none', color: draftQ.question_type === t ? 'var(--indigo)' : 'var(--text-2)', cursor: 'pointer' }}
                      >
                        {t.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question text — supports LaTeX */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={qs}>Question</label>
                  <LatexInput
                    value={draftQ.question_text}
                    onChange={(val) => setDraftField('question_text', val)}
                    placeholder="Enter question…"
                  />
                </div>

                {/* Multiple choice options — each supports LaTeX */}
                {draftQ.question_type === 'multiple_choice' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={qs}>Options <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(select correct)</span></label>
                    {(draftQ.options ?? []).map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                        <input
                          type="radio"
                          name={`correct-${draftQ.id}`}
                          checked={draftQ.correct_answer === String(i)}
                          onChange={() => setDraftField('correct_answer', String(i))}
                          onMouseDown={stop}
                          style={{ accentColor: 'var(--indigo)', flexShrink: 0, marginTop: 8 }}
                        />
                        <div style={{ flex: 1 }}>
                          <LatexInput
                            value={opt}
                            onChange={(val) => setDraftOption(i, val)}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          />
                        </div>
                        {(draftQ.options?.length ?? 0) > 2 && (
                          <button
                            onMouseDown={stop}
                            onClick={(e) => { stop(e); setDraftField('options', draftQ.options!.filter((_, j) => j !== i)) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14, lineHeight: 1, marginTop: 6, flexShrink: 0 }}
                          >×</button>
                        )}
                      </div>
                    ))}
                    {(draftQ.options?.length ?? 0) < 6 && (
                      <button
                        onMouseDown={stop}
                        onClick={(e) => { stop(e); setDraftField('options', [...(draftQ.options ?? []), '']) }}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-2)', marginTop: 2 }}
                      >+ Option</button>
                    )}
                  </div>
                )}

                {/* True/false */}
                {draftQ.question_type === 'true_false' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={qs}>Correct answer</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['true', 'false'].map((v) => (
                        <button
                          key={v}
                          onMouseDown={stop}
                          onClick={(e) => { stop(e); setDraftField('correct_answer', v) }}
                          style={{ padding: '4px 16px', borderRadius: 4, border: `1px solid ${draftQ.correct_answer === v ? 'var(--indigo)' : 'var(--border)'}`, background: draftQ.correct_answer === v ? 'var(--indigo-muted)' : 'none', color: draftQ.correct_answer === v ? 'var(--indigo)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}
                        >
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short answer — supports LaTeX */}
                {draftQ.question_type === 'short_answer' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={qs}>Correct answer</label>
                    <LatexInput
                      value={draftQ.correct_answer}
                      onChange={(val) => setDraftField('correct_answer', val)}
                      placeholder="e.g. 4"
                    />
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '3px 0 0' }}>Compared case-insensitively after trimming.</p>
                  </div>
                )}

                {/* Explanation — supports LaTeX */}
                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={qs}>Explanation <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
                  <LatexInput
                    value={draftQ.explanation ?? ''}
                    onChange={(val) => setDraftField('explanation', val || null)}
                    placeholder="Shown after answering…"
                  />
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onMouseDown={stop}
                    onClick={(e) => { stop(e); saveQuestion() }}
                    disabled={!draftQ.question_text.trim()}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, border: 'none', background: 'var(--indigo)', color: 'white', cursor: 'pointer', opacity: draftQ.question_text.trim() ? 1 : 0.5 }}
                  >Save</button>
                  <button
                    onMouseDown={stop}
                    onClick={(e) => { stop(e); setDraftQ(null); setEditingIdx(null) }}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-2)' }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {!draftQ && (
              <button
                onMouseDown={stop}
                onClick={(e) => { stop(e); startAdd() }}
                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-2)', marginTop: 4 }}
              >
                + Add question
              </button>
            )}
          </div>
        )}

        {/* Preview mode */}
        {mode === 'previewing' && (
          <div style={{ padding: '0.875rem 1rem' }}>
            {questions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No questions yet.</p>
            ) : !submitted ? (
              <>
                {questions.map((q, idx) => (
                  <div key={q.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: 14, fontWeight: 500 }}>{idx + 1}. {q.question_text}</p>
                    {q.question_type === 'multiple_choice' && q.options?.map((opt, i) => (
                      <label
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, border: `1px solid ${answers[q.id] === String(i) ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', background: answers[q.id] === String(i) ? 'var(--indigo-muted)' : 'transparent', fontSize: 13 }}
                      >
                        <input type="radio" name={q.id} checked={answers[q.id] === String(i)} onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(i) }))} onMouseDown={stop} style={{ accentColor: 'var(--indigo)' }} />
                        {opt}
                      </label>
                    ))}
                    {q.question_type === 'true_false' && ['true', 'false'].map((v) => (
                      <label
                        key={v}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4, border: `1px solid ${answers[q.id] === v ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', background: answers[q.id] === v ? 'var(--indigo-muted)' : 'transparent', fontSize: 13, width: 'fit-content' }}
                      >
                        <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))} onMouseDown={stop} style={{ accentColor: 'var(--indigo)' }} />
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </label>
                    ))}
                    {q.question_type === 'short_answer' && (
                      <input
                        className="input"
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        onMouseDown={stop}
                        onClick={stop}
                        onKeyDown={stop}
                        onKeyUp={stop}
                        onFocus={stop}
                        placeholder="Your answer…"
                        style={{ maxWidth: 300 }}
                      />
                    )}
                  </div>
                ))}
                <button
                  onMouseDown={stop}
                  onClick={(e) => { stop(e); handleSubmitPreview() }}
                  disabled={questions.some((q) => !answers[q.id]?.trim())}
                  style={{ fontSize: 13, padding: '6px 16px', borderRadius: 4, border: 'none', background: 'var(--indigo)', color: 'white', cursor: 'pointer', opacity: questions.some((q) => !answers[q.id]?.trim()) ? 0.5 : 1 }}
                >
                  Check answers
                </button>
              </>
            ) : (
              <>
                {questions.map((q, idx) => {
                  const given = answers[q.id] ?? ''
                  const correct = isCorrect(q, given)
                  return (
                    <div key={q.id} style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius)', border: `1px solid ${correct ? 'var(--success)' : 'var(--danger)'}`, background: correct ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>{idx + 1}. {q.question_text}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: correct ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {correct ? '✓ Correct' : '✗ Incorrect'}
                        {!correct && q.question_type !== 'short_answer' && (
                          <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>
                            Correct: {q.question_type === 'multiple_choice' ? q.options?.[Number(q.correct_answer)] ?? q.correct_answer : q.correct_answer}
                          </span>
                        )}
                      </p>
                      {q.explanation && (
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>{q.explanation}</p>
                      )}
                    </div>
                  )
                })}
                <button
                  onMouseDown={stop}
                  onClick={(e) => { stop(e); handleRetryPreview() }}
                  style={{ fontSize: 13, padding: '6px 16px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-2)' }}
                >
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const qs: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-2)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
}
