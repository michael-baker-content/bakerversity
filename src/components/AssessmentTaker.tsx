'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import LessonRenderer from '@/components/LessonRenderer'

const MafsGraph = dynamic(() => import('@/components/MafsGraph'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'text_response'

interface Question {
  id: string
  question_type: QuestionType
  content: Record<string, unknown> | null
  question_text: string | null       // fallback plain text
  options: string[] | null
  position: number
}

interface QuestionResult {
  question_id: string
  question_type: string
  given_answer: string
  is_correct: boolean | null
  correct_answer: string | null
}

interface SubmitResponse {
  score: number
  passed: boolean
  passing_score: number
  assessment_type: string
  is_graded: boolean
  results: QuestionResult[]
}

interface AssessmentTakerProps {
  assessmentId: string
  title: string
  assessmentType: 'quiz' | 'exam' | 'practice'
  isGraded: boolean
  passingScore: number
  introContent: Record<string, unknown> | null
  questions: Question[]
}

// ── QuestionBody — renders TipTap JSON or plain text fallback ─────────────────
// Uses LessonRenderer for rich content. Never uses dangerouslySetInnerHTML on
// student-submitted data — only on instructor-authored question content which
// goes through the same renderer pipeline as lesson content.

function QuestionBody({ question }: { question: Question }) {
  if (question.content && !isEmptyDoc(question.content)) {
    return (
      <div className="lesson-content" style={{ marginBottom: '0.75rem' }}>
        <LessonRenderer content={question.content} />
      </div>
    )
  }
  // Plain text fallback
  return (
    <p style={{ margin: '0 0 0.75rem', fontWeight: 500, fontSize: 15, lineHeight: 1.6 }}>
      {question.question_text ?? ''}
    </p>
  )
}

function isEmptyDoc(doc: Record<string, unknown>): boolean {
  const content = doc.content as unknown[] | undefined
  if (!content?.length) return true
  if (content.length === 1) {
    const first = content[0] as Record<string, unknown>
    if (first.type === 'paragraph' && !first.content) return true
  }
  return false
}

// ── StudentAnswer — renders a plain-text student answer safely ────────────────
// Always renders as text, never as HTML. This is the XSS boundary for
// student-submitted content.

function StudentAnswer({ text }: { text: string }) {
  return <span style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>{text || '(no response)'}</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessmentTaker({
  assessmentId,
  title,
  assessmentType,
  isGraded,
  passingScore,
  introContent,
  questions,
}: AssessmentTakerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [error, setError] = useState('')

  const setAnswer = (questionId: string, value: string) =>
    setAnswers((a) => ({ ...a, [questionId]: value }))

  // text_response answers are optional; all other types must be answered
  const gradedQuestions = questions.filter((q) => q.question_type !== 'text_response')
  const allGradedAnswered = gradedQuestions.every((q) => answers[q.id]?.trim())

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    const res = await fetch(`/api/students/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Submission failed. Please try again.')
      setSubmitting(false)
      return
    }

    const data: SubmitResponse = await res.json()
    setResult(data)
    setSubmitting(false)

    setTimeout(() => {
      document.getElementById('assessment-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleRetake = () => {
    setResult(null)
    setAnswers({})
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isPractice = assessmentType === 'practice'

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-serif)' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          {isPractice
            ? 'Practice — ungraded'
            : isGraded
              ? `${questions.length} question${questions.length !== 1 ? 's' : ''} · ${passingScore}% to pass`
              : `${questions.length} question${questions.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* Intro content */}
      {introContent && !isEmptyDoc(introContent) && (
        <div className="lesson-content" style={{ marginBottom: '2rem' }}>
          <LessonRenderer content={introContent} />
        </div>
      )}

      {/* Questions or results */}
      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, index) => (
            <div
              key={q.id}
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface)',
              }}
            >
              {/* Question number */}
              <p style={{ margin: '0 0 0.75rem', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                Question {index + 1}
                {q.question_type === 'text_response' && (
                  <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-3)' }}>
                    (optional — not graded)
                  </span>
                )}
              </p>

              {/* Question body */}
              <QuestionBody question={q} />

              {/* Answer input — by type */}
              {q.question_type === 'multiple_choice' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, i) => {
                    const selected = answers[q.id] === String(i)
                    return (
                      <label
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          border: `1px solid ${selected ? 'var(--indigo)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: 14,
                          background: selected ? 'var(--indigo-muted)' : 'var(--surface)',
                          transition: 'border-color 0.1s, background 0.1s',
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={String(i)}
                          checked={selected}
                          onChange={() => setAnswer(q.id, String(i))}
                          style={{ accentColor: 'var(--indigo)', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {opt}
                      </label>
                    )
                  })}
                </div>
              )}

              {q.question_type === 'true_false' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {['true', 'false'].map((val) => {
                    const selected = answers[q.id] === val
                    return (
                      <label
                        key={val}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 20px',
                          border: `1px solid ${selected ? 'var(--indigo)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: 14,
                          background: selected ? 'var(--indigo-muted)' : 'var(--surface)',
                          transition: 'border-color 0.1s, background 0.1s',
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={val}
                          checked={selected}
                          onChange={() => setAnswer(q.id, val)}
                          style={{ accentColor: 'var(--indigo)', flexShrink: 0 }}
                        />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    )
                  })}
                </div>
              )}

              {q.question_type === 'short_answer' && (
                <div>
                  <input
                    className="input"
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer…"
                    autoComplete="off"
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>
                    Enter your answer exactly.
                  </p>
                </div>
              )}

              {q.question_type === 'text_response' && (
                <div>
                  <textarea
                    className="input"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Type your response here…"
                    rows={5}
                    style={{ resize: 'vertical' }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>
                    This response is for reflection only and does not affect your score.
                  </p>
                </div>
              )}
            </div>
          ))}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !allGradedAnswered}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', opacity: submitting || !allGradedAnswered ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting…' : isPractice ? 'Submit' : 'Submit for grading'}
          </button>
        </div>
      ) : (
        // ── Results view ───────────────────────────────────────────────────
        <div id="assessment-results">

          {/* Score banner — only shown for graded assessments */}
          {!isPractice && isGraded && (
            <div style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2rem',
              background: result.passed ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${result.passed ? 'var(--success)' : 'var(--danger)'}`,
            }}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: result.passed ? 'var(--success)' : 'var(--danger)',
                marginBottom: 4,
              }}>
                {result.passed ? '✓ Passed' : '✗ Not yet'}
              </div>
              <div style={{ fontSize: 15, color: result.passed ? 'var(--success)' : 'var(--danger)' }}>
                Score: {result.score}% · Passing: {result.passing_score}%
              </div>
              {!result.passed && (
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '8px 0 0' }}>
                  Review the feedback below and try again when you're ready.
                </p>
              )}
            </div>
          )}

          {isPractice && (
            <div style={{
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                Practice complete. Review the answers below.
              </p>
            </div>
          )}

          {/* Per-question results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {result.results.map((r, index) => {
              const question = questions.find((q) => q.id === r.question_id)
              const isTextResponse = r.question_type === 'text_response'
              const isCorrect = r.is_correct

              let borderColor = 'var(--border)'
              let bgColor = 'var(--surface)'
              if (!isTextResponse) {
                borderColor = isCorrect ? 'var(--success)' : 'var(--danger)'
                bgColor = isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)'
              }

              return (
                <div
                  key={r.question_id}
                  style={{
                    padding: '1.25rem',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 'var(--radius-lg)',
                    background: bgColor,
                  }}
                >
                  <p style={{ margin: '0 0 0.75rem', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                    Question {index + 1}
                  </p>

                  {/* Question body */}
                  {question && <QuestionBody question={question} />}

                  {/* Result */}
                  {isTextResponse ? (
                    <div style={{ fontSize: 14 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                        Your response:
                      </p>
                      <StudentAnswer text={r.given_answer} />
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0 0' }}>
                        This response is for reflection only.
                      </p>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontWeight: 600,
                          color: isCorrect ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                        {!isCorrect && r.correct_answer !== null && r.question_type !== 'short_answer' && (
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                            · Correct: {
                              r.question_type === 'multiple_choice' && question?.options
                                ? question.options[Number(r.correct_answer)] ?? r.correct_answer
                                : r.correct_answer.charAt(0).toUpperCase() + r.correct_answer.slice(1)
                            }
                          </span>
                        )}
                        {!isCorrect && r.question_type === 'short_answer' && (
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                            · You answered: <StudentAnswer text={r.given_answer} />
                          </span>
                        )}
                      </div>

                      {/* Explanation — rendered via LessonRenderer if rich content exists */}
                      {question && getExplanation(question) && (
                        <div style={{
                          marginTop: 10,
                          padding: '0.75rem 1rem',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          fontSize: 14,
                        }}>
                          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Explanation
                          </p>
                          <ExplanationBody question={question} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Retake button — always available (infinite retakes) */}
          <button onClick={handleRetake} className="btn btn-ghost">
            {isPractice ? 'Try again' : result.passed ? 'Retake' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helpers for explanation rendering ────────────────────────────────────────

interface QuestionWithExplanation {
  explanation_content?: Record<string, unknown> | null
  explanation?: string | null
}

function getExplanation(q: Question & QuestionWithExplanation): boolean {
  if (q.explanation_content && !isEmptyDoc(q.explanation_content)) return true
  if (q.explanation?.trim()) return true
  return false
}

function ExplanationBody({ question }: { question: Question & QuestionWithExplanation }) {
  if (question.explanation_content && !isEmptyDoc(question.explanation_content)) {
    return (
      <div className="lesson-content">
        <LessonRenderer content={question.explanation_content} />
      </div>
    )
  }
  return <p style={{ margin: 0, color: 'var(--text-2)' }}>{question.explanation ?? ''}</p>
}
