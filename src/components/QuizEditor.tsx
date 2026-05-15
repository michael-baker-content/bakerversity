'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import LatexModal from '@/components/LatexModal'

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'text_response'
  options: string[] | null
  correct_answer: string
  explanation: string | null
  position: number
}

interface Quiz {
  id: string
  title: string
  passing_score: number
}

interface QuizEditorProps {
  courseId: string
  lessonId: string
}

// ── Math text renderer ────────────────────────────────────────────────────────
function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1)
          const html = (() => {
            try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }) }
            catch { return latex }
          })()
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── LaTeX modal ───────────────────────────────────────────────────────────────
function LatexModal({
  onInsert,
  onClose,
}: {
  onInsert: (latex: string) => void
  onClose: () => void
}) {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 10, width: 560, maxWidth: '95vw',
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Algebra 1 LaTeX Formulas</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee', overflowX: 'auto' }}>
          {LATEX_CATEGORIES.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(i)} style={{
              padding: '8px 14px', fontSize: 13, border: 'none', background: 'none',
              borderBottom: `2px solid ${activeCategory === i ? '#111' : 'transparent'}`,
              fontWeight: activeCategory === i ? 600 : 400,
              color: activeCategory === i ? '#111' : '#666',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Formula grid */}
        <div style={{ padding: '1rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LATEX_CATEGORIES[activeCategory].formulas.map((f, i) => {
            const rendered = (() => {
              try { return katex.renderToString(f.latex, { throwOnError: false, displayMode: false }) }
              catch { return f.latex }
            })()
            return (
              <button key={i} onClick={() => { onInsert(f.latex); onClose() }} style={{
                padding: '10px 12px', border: '1px solid #eee', borderRadius: 8,
                background: 'white', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#eee')}
              >
                <span style={{ fontSize: 11, color: '#aaa' }}>{f.label}</span>
                <span dangerouslySetInnerHTML={{ __html: rendered }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Question form ─────────────────────────────────────────────────────────────
type ExplanationMap = Record<string, string>

type QuestionFormState = {
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'text_response'
  options: string[]
  correct_answer: string
  explanations: ExplanationMap  // key: option index or 'response', value: explanation text
}

function parseExplanations(raw: string | null, questionType: string, options: string[] | null): ExplanationMap {
  if (!raw) return {}
  // Try parsing as JSON map first
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* not JSON */ }
  // Legacy: single string — assign to correct answer slot
  if (questionType === 'true_false') return { true: raw, false: '' }
  if (questionType === 'text_response') return { response: raw }
  // multiple choice: put on first option
  const map: ExplanationMap = {}
  if (options) options.forEach((_, i) => { map[String(i)] = i === 0 ? raw : '' })
  return map
}

function QuestionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: QuestionFormState
  onSave: (data: QuestionFormState) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<QuestionFormState>(initial)
  const [showLatexModal, setShowLatexModal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertLatex = (latex: string, _displayMode?: boolean) => {
    const el = textareaRef.current
    if (!el) {
      setForm((f) => ({ ...f, question_text: f.question_text + `$${latex}$` }))
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = form.question_text
    const inserted = `$${latex}$`
    const newText = text.slice(0, start) + inserted + text.slice(end)
    setForm((f) => ({ ...f, question_text: newText }))
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + inserted.length, start + inserted.length)
    }, 0)
  }

  const setExplanation = (key: string, value: string) => {
    setForm((f) => ({ ...f, explanations: { ...f.explanations, [key]: value } }))
  }

  const explanationLabel = (key: string, type: string, options: string[]) => {
    if (type === 'true_false') return `If student answers "${key.charAt(0).toUpperCase() + key.slice(1)}"`
    if (type === 'text_response') return 'General feedback (shown after submission)'
    const idx = Number(key)
    const isCorrect = form.correct_answer === key
    return `Option ${String.fromCharCode(65 + idx)}${isCorrect ? ' ✓ (correct)' : ''}: "${options[idx] || '...'}"`
  }

  return (
    <>
      {showLatexModal && <LatexModal onInsert={insertLatex} onClose={() => setShowLatexModal(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Question type</label>
          <select
            value={form.question_type}
            onChange={(e) => {
              const t = e.target.value as typeof form.question_type
              setForm((q) => ({
                ...q,
                question_type: t,
                correct_answer: t === 'true_false' ? 'true' : '0',
                explanations: {},
              }))
            }}
            style={inputStyle}
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / False</option>
            <option value="text_response">Text response</option>
          </select>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Question text <span style={{ fontWeight: 400, color: '#888' }}>(supports $LaTeX$)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowLatexModal(true)}
              style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ddd', borderRadius: 4, background: 'white', cursor: 'pointer', color: '#555' }}
            >
              ∑ Insert formula
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={form.question_text}
            onChange={(e) => setForm((q) => ({ ...q, question_text: e.target.value }))}
            rows={3}
            placeholder="e.g. Solve for x: $2x + 4 = 10$"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {form.question_text && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6, fontSize: 14 }}>
              <span style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Preview</span>
              <MathText text={form.question_text} />
            </div>
          )}
        </div>

        {form.question_type === 'multiple_choice' && (
          <div>
            <label style={labelStyle}>Answer choices</label>
            {form.options.map((opt, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="correct_edit"
                    checked={form.correct_answer === String(i)}
                    onChange={() => setForm((q) => ({ ...q, correct_answer: String(i) }))}
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...form.options]
                      opts[i] = e.target.value
                      setForm((q) => ({ ...q, options: opts }))
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Select the radio button next to the correct answer.</p>
          </div>
        )}

        {form.question_type === 'true_false' && (
          <div>
            <label style={labelStyle}>Correct answer</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['true', 'false'].map((val) => (
                <label key={val} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="tf_correct_edit"
                    checked={form.correct_answer === val}
                    onChange={() => setForm((q) => ({ ...q, correct_answer: val }))}
                  />
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Per-option explanations */}
        <div>
          <label style={labelStyle}>
            Explanations <span style={{ fontWeight: 400, color: '#888' }}>(shown to student after submitting)</span>
          </label>

          {form.question_type === 'multiple_choice' && form.options.map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>
                {explanationLabel(String(i), form.question_type, form.options)}
              </label>
              <textarea
                value={form.explanations[String(i)] ?? ''}
                onChange={(e) => setExplanation(String(i), e.target.value)}
                rows={2}
                placeholder="Optional explanation for this answer choice"
                style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }}
              />
            </div>
          ))}

          {form.question_type === 'true_false' && ['true', 'false'].map((val) => (
            <div key={val} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>
                {explanationLabel(val, form.question_type, [])}
              </label>
              <textarea
                value={form.explanations[val] ?? ''}
                onChange={(e) => setExplanation(val, e.target.value)}
                rows={2}
                placeholder="Optional explanation"
                style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }}
              />
            </div>
          ))}

          {form.question_type === 'text_response' && (
            <textarea
              value={form.explanations['response'] ?? ''}
              onChange={(e) => setExplanation('response', e.target.value)}
              rows={2}
              placeholder="Optional general feedback shown after submission"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.question_text.trim()}
            style={{ padding: '7px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            {saving ? 'Saving...' : 'Save question'}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main QuizEditor ───────────────────────────────────────────────────────────
const emptyQuestion: QuestionFormState = {
  question_text: '',
  question_type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '0',
  explanations: {},
}

export default function QuizEditor({ courseId, lessonId }: QuizEditorProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [passingScore, setPassingScore] = useState(70)

  const basePath = `/api/admin/courses/${courseId}/lessons/${lessonId}/quiz`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(basePath)
    const data = await res.json()
    setQuiz(data.quiz ?? null)
    setQuestions(data.questions ?? [])
    if (data.quiz) setPassingScore(data.quiz.passing_score)
    setLoading(false)
  }, [basePath])

  useEffect(() => { load() }, [load])

  const createQuiz = async () => {
    setSaving(true)
    const res = await fetch(basePath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passing_score: passingScore }),
    })
    const data = await res.json()
    setQuiz(data)
    setSaving(false)
  }

  const updatePassingScore = async (score: number) => {
    if (!quiz) return
    setPassingScore(score)
    await fetch(basePath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passing_score: score }),
    })
  }

  const buildPayload = (form: QuestionFormState) => {
    const payload: Record<string, unknown> = {
      question_text: form.question_text,
      question_type: form.question_type,
      correct_answer: form.correct_answer,
      explanation: JSON.stringify(form.explanations),
    }
    if (form.question_type === 'multiple_choice') {
      payload.options = form.options.filter(o => o.trim())
    } else if (form.question_type === 'true_false') {
      payload.options = ['true', 'false']
    } else {
      payload.options = null
    }
    return payload
  }

  const addQuestion = async (form: QuestionFormState) => {
    setSaving(true)
    const res = await fetch(`${basePath}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    })
    if (res.ok) { setShowAddForm(false); await load() }
    setSaving(false)
  }

  const updateQuestion = async (questionId: string, form: QuestionFormState) => {
    setSaving(true)
    const res = await fetch(`${basePath}/questions/${questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    })
    if (res.ok) { setEditingId(null); await load() }
    setSaving(false)
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    await fetch(`${basePath}/questions/${questionId}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <div style={{ padding: '1rem', color: '#888' }}>Loading quiz...</div>

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Quiz</h2>
        {quiz && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <label>Passing score:</label>
            <input
              type="number" min={0} max={100} value={passingScore}
              onChange={(e) => updatePassingScore(Number(e.target.value))}
              style={{ width: 60, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
            />
            <span>%</span>
          </div>
        )}
      </div>

      {!quiz ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #ddd', borderRadius: 8 }}>
          <p style={{ color: '#888', marginBottom: '1rem' }}>No quiz for this lesson yet.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: 13 }}>Passing score:</label>
            <input
              type="number" min={0} max={100} value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              style={{ width: 60, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
            />
            <span style={{ fontSize: 13 }}>%</span>
          </div>
          <button onClick={createQuiz} disabled={saving}
            style={{ padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {saving ? 'Creating...' : 'Add quiz to this lesson'}
          </button>
        </div>
      ) : (
        <>
          {questions.length === 0 && !showAddForm && (
            <p style={{ color: '#888', fontSize: 14 }}>No questions yet. Add your first question below.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            {questions.map((q, index) => (
              <div key={q.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                {editingId === q.id ? (
                  <div style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.75rem', fontSize: 13, fontWeight: 500, color: '#555' }}>Editing question {index + 1}</p>
                    <QuestionForm
                      initial={{
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options ?? ['', '', '', ''],
                        correct_answer: q.correct_answer,
                        explanations: parseExplanations(q.explanation, q.question_type, q.options),
                      }}
                      onSave={(form) => updateQuestion(q.id, form)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#aaa' }}>{index + 1}</span>
                          <span style={{
                            fontSize: 11, padding: '1px 6px', borderRadius: 10,
                            background: q.question_type === 'multiple_choice' ? '#e0f2fe' : q.question_type === 'true_false' ? '#fef9c3' : '#f0fdf4',
                            color: q.question_type === 'multiple_choice' ? '#0369a1' : q.question_type === 'true_false' ? '#854d0e' : '#166534',
                          }}>
                            {q.question_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14 }}>{q.question_text}</p>
                        {q.question_type !== 'text_response' && (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
                            Answer: {q.question_type === 'multiple_choice'
                              ? q.options?.[Number(q.correct_answer)] ?? q.correct_answer
                              : q.correct_answer}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setPreviewId(previewId === q.id ? null : q.id)}
                          style={{ fontSize: 12, color: previewId === q.id ? '#0369a1' : '#555', background: previewId === q.id ? '#e0f2fe' : 'none', border: '1px solid #eee', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>
                          {previewId === q.id ? 'Hide' : 'Preview'}
                        </button>
                        <button onClick={() => { setEditingId(q.id); setPreviewId(null) }}
                          style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>
                          Edit
                        </button>
                        <button onClick={() => deleteQuestion(q.id)}
                          style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                          Delete
                        </button>
                      </div>
                    </div>

                    {previewId === q.id && (
                      <div style={{ padding: '1rem', borderTop: '1px solid #eee', background: '#fafafa' }}>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student preview</p>
                        <p style={{ margin: '0 0 0.75rem', fontWeight: 500, fontSize: 15 }}>
                          <MathText text={q.question_text} />
                        </p>

                        {q.question_type === 'multiple_choice' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {q.options.map((opt, i) => {
                              const expMap = parseExplanations(q.explanation, q.question_type, q.options)
                              const exp = expMap[String(i)]
                              return (
                                <div key={i}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '7px 12px', borderRadius: 6, fontSize: 14,
                                    border: `1px solid ${String(i) === q.correct_answer ? '#bbf7d0' : '#eee'}`,
                                    background: String(i) === q.correct_answer ? '#f0fdf4' : 'white',
                                  }}>
                                    <span style={{ color: '#aaa', fontSize: 12, minWidth: 16 }}>{String.fromCharCode(65 + i)}.</span>
                                    <MathText text={opt} />
                                    {String(i) === q.correct_answer && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#166534' }}>✓ correct</span>}
                                  </div>
                                  {exp && <p style={{ margin: '2px 0 4px 12px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>↳ {exp}</p>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {q.question_type === 'true_false' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {['true', 'false'].map((val) => {
                              const expMap = parseExplanations(q.explanation, q.question_type, q.options)
                              const exp = expMap[val]
                              return (
                                <div key={val}>
                                  <div style={{
                                    padding: '7px 16px', borderRadius: 6, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8,
                                    border: `1px solid ${val === q.correct_answer ? '#bbf7d0' : '#eee'}`,
                                    background: val === q.correct_answer ? '#f0fdf4' : 'white',
                                  }}>
                                    {val.charAt(0).toUpperCase() + val.slice(1)}
                                    {val === q.correct_answer && <span style={{ fontSize: 11, color: '#166534' }}>✓</span>}
                                  </div>
                                  {exp && <p style={{ margin: '2px 0 4px 12px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>↳ {exp}</p>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {q.question_type === 'text_response' && (
                          <div style={{ padding: '8px 10px', border: '1px solid #eee', borderRadius: 6, background: 'white', color: '#aaa', fontSize: 14 }}>
                            Student response will appear here...
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>New question</h3>
              <QuestionForm
                initial={{ ...emptyQuestion, options: ['', '', '', ''] }}
                onSave={addQuestion}
                onCancel={() => setShowAddForm(false)}
                saving={saving}
              />
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              style={{ padding: '7px 14px', fontSize: 13, border: '1px dashed #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#555' }}>
              + Add question
            </button>
          )}
        </>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box',
}
