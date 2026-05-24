'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { MafsGraphAttrs } from './MafsGraph'
import { renderNode } from './renderer/renderNode'
import { HtmlSegment } from './renderer/HtmlSegment'
import type { PracticeQuizQuestion } from './editor/nodes'

const MafsGraph = dynamic(() => import('./MafsGraph'), { ssr: false })

interface LessonRendererProps {
  content: Record<string, unknown>
}

type Segment =
  | { type: 'html'; html: string }
  | { type: 'graph'; attrs: MafsGraphAttrs }
  | { type: 'practiceQuiz'; title: string; questions: PracticeQuizQuestion[] }

function buildSegments(content: Record<string, unknown>): Segment[] {
  const topNodes = (content.content as Record<string, unknown>[] | undefined) ?? []
  const segments: Segment[] = []
  let currentHtml = ''

  for (const node of topNodes) {
    const nodeType = node.type as string

    if (nodeType === 'mafsGraph') {
      if (currentHtml) { segments.push({ type: 'html', html: currentHtml }); currentHtml = '' }
      segments.push({ type: 'graph', attrs: node.attrs as unknown as MafsGraphAttrs })
    } else if (nodeType === 'practiceQuiz') {
      if (currentHtml) { segments.push({ type: 'html', html: currentHtml }); currentHtml = '' }
      const attrs = (node.attrs as Record<string, unknown>) ?? {}
      segments.push({
        type: 'practiceQuiz',
        title: (attrs.title as string) ?? 'Practice Quiz',
        questions: Array.isArray(attrs.questions) ? attrs.questions as PracticeQuizQuestion[] : [],
      })
    } else {
      currentHtml += renderNode(node)
    }
  }

  if (currentHtml) segments.push({ type: 'html', html: currentHtml })
  return segments
}

// ── PracticeQuizPlayer — client-side interactive quiz ─────────────────────────

function normalise(s: string) { return s.trim().toLowerCase() }

function PracticeQuizPlayer({ title, questions }: {
  title: string
  questions: PracticeQuizQuestion[]
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const setAnswer = (id: string, val: string) =>
    setAnswers((a) => ({ ...a, [id]: val }))

  const allAnswered = questions.every((q) => answers[q.id]?.trim())

  const isCorrect = (q: PracticeQuizQuestion, given: string): boolean => {
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      return given === q.correct_answer
    }
    if (q.question_type === 'short_answer') {
      const norm = normalise(given)
      return (q.accepted_answers ?? [q.correct_answer]).some((a) => normalise(a) === norm)
    }
    return false
  }

  const handleRetry = () => { setAnswers({}); setSubmitted(false) }

  if (questions.length === 0) return null

  return (
    <div style={{
      border: '2px solid var(--indigo)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      margin: '1.5rem 0',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--indigo-muted)',
        borderBottom: '1px solid var(--indigo)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ✦ Practice Quiz
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '1rem' }}>
        {!submitted ? (
          <>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ margin: '0 0 0.625rem', fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>
                  {idx + 1}. {q.question_text}
                </p>

                {q.question_type === 'multiple_choice' && q.options?.map((opt, i) => {
                  const selected = answers[q.id] === String(i)
                  return (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', marginBottom: 6,
                      border: `1px solid ${selected ? 'var(--indigo)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 14,
                      background: selected ? 'var(--indigo-muted)' : 'var(--surface)',
                      transition: 'border-color 0.1s, background 0.1s',
                    }}>
                      <input type="radio" name={q.id} checked={selected} onChange={() => setAnswer(q.id, String(i))} style={{ accentColor: 'var(--indigo)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </label>
                  )
                })}

                {q.question_type === 'true_false' && ['true', 'false'].map((v) => {
                  const selected = answers[q.id] === v
                  return (
                    <label key={v} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', marginBottom: 6, width: 'fit-content',
                      border: `1px solid ${selected ? 'var(--indigo)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 14,
                      background: selected ? 'var(--indigo-muted)' : 'var(--surface)',
                      transition: 'border-color 0.1s, background 0.1s',
                    }}>
                      <input type="radio" name={q.id} checked={selected} onChange={() => setAnswer(q.id, v)} style={{ accentColor: 'var(--indigo)', flexShrink: 0 }} />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </label>
                  )
                })}

                {q.question_type === 'short_answer' && (
                  <input
                    style={{ display: 'block', width: '100%', maxWidth: 360, padding: '8px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer…"
                    autoComplete="off"
                  />
                )}
              </div>
            ))}

            <button
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 'var(--radius)',
                background: 'var(--indigo)', color: 'white',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                opacity: allAnswered ? 1 : 0.5,
                transition: 'opacity 0.15s',
              }}
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
                <div key={q.id} style={{
                  marginBottom: '0.875rem', padding: '0.875rem',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${correct ? 'var(--success)' : 'var(--danger)'}`,
                  background: correct ? 'var(--success-bg)' : 'var(--danger-bg)',
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 500 }}>
                    {idx + 1}. {q.question_text}
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: correct ? 'var(--success)' : 'var(--danger)' }}>
                    {correct ? '✓ Correct' : '✗ Incorrect'}
                    {!correct && q.question_type !== 'short_answer' && (
                      <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>
                        Correct answer: {
                          q.question_type === 'multiple_choice'
                            ? q.options?.[Number(q.correct_answer)] ?? q.correct_answer
                            : q.correct_answer.charAt(0).toUpperCase() + q.correct_answer.slice(1)
                        }
                      </span>
                    )}
                    {!correct && q.question_type === 'short_answer' && (
                      <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>
                        You answered: <em>{given}</em>
                      </span>
                    )}
                  </p>
                  {q.explanation && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
              )
            })}

            <button
              onClick={handleRetry}
              style={{
                padding: '8px 20px', fontSize: 14,
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: 'var(--surface)', color: 'var(--text-2)',
                cursor: 'pointer', marginTop: 4,
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export default function LessonRenderer({ content }: LessonRendererProps) {
  const segments = buildSegments(content)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'graph') return <MafsGraph key={i} attrs={seg.attrs} />
        if (seg.type === 'practiceQuiz') return <PracticeQuizPlayer key={i} title={seg.title} questions={seg.questions} />
        return <HtmlSegment key={i} html={seg.html} />
      })}
      <style>{`
        .lesson-content p { margin: 0 0 1rem; }
        .lesson-content h2 { font-size: 1.5rem; margin: 2rem 0 0.75rem; }
        .lesson-content h3 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
        .lesson-content ul, .lesson-content ol { padding-left: 1.5rem; margin: 0 0 1rem; }
        .lesson-content li { margin-bottom: 0.25rem; }
        .lesson-content blockquote { border-left: 3px solid var(--border); padding-left: 1rem; color: var(--text-2); margin: 1rem 0; }
        .lesson-content pre { overflow-x: auto; margin: 1rem 0; }
        .lesson-content code { background: var(--surface-2); padding: 2px 5px; border-radius: 3px; font-size: 14px; }
        .lesson-content pre code { background: none; padding: 0; }
        .lesson-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
        .lesson-content a { color: var(--indigo); text-decoration: underline; }
        .lesson-content table { border-collapse: collapse; width: auto; min-width: 120px; margin: 1rem 0; }
        .lesson-content th, .lesson-content td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 14px; }
        .lesson-content th { background: var(--surface-2); font-weight: 600; }
        .lesson-content [data-block-math] { text-align: center; margin: 1.5rem 0; }
        .lesson-content [data-inline-math] { display: inline; }
        .lesson-content figure { margin: 1rem 0; }
        .lesson-content figcaption { text-align: center; font-size: 13px; color: var(--text-3); margin-top: 4px; font-style: italic; }
      `}</style>
    </>
  )
}
