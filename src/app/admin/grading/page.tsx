'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'

interface QuestionResponse {
  question_id: string
  question_text: string
  question_content: Record<string, unknown> | null
  answer: string
  feedback: { feedback_text: string; updated_at: string } | null
}

interface AttemptGroup {
  attempt_id: string
  attempted_at: string
  score: number
  passed: boolean
  student: { id: string; full_name: string | null; email: string }
  course: { id: string; title: string; slug: string }
  assessment: { id: string; title: string }
  responses: QuestionResponse[]
}

// Renders a question body — uses TipTap content if available,
// falls back to plain question_text.
function QuestionBody({ response }: { response: QuestionResponse }) {
  if (response.question_content && !isEmptyDoc(response.question_content)) {
    return (
      <div className="lesson-content" style={{ marginBottom: 8 }}>
        <LessonRenderer content={response.question_content} />
      </div>
    )
  }
  return (
    <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
      {response.question_text}
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

function GradingContent() {
  const [groups, setGroups] = useState<AttemptGroup[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'reviewed'>('unreviewed')
  const [courseFilter, setCourseFilter] = useState<string>(searchParams.get('course') ?? 'all')
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/grading')
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.responses ?? [])
        // Pre-populate feedback inputs with existing feedback
        const initial: Record<string, string> = {}
        for (const group of data.responses ?? []) {
          for (const r of group.responses) {
            if (r.feedback) {
              initial[`${group.attempt_id}:${r.question_id}`] = r.feedback.feedback_text
            }
          }
        }
        setFeedback(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveFeedback = async (group: AttemptGroup, response: QuestionResponse) => {
    const key = `${group.attempt_id}:${response.question_id}`
    const text = feedback[key]?.trim()
    if (!text) return

    setSaving((s) => ({ ...s, [key]: true }))

    await fetch('/api/admin/grading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment_attempt_id: group.attempt_id,
        question_id: response.question_id,
        student_id: group.student.id,
        feedback_text: text,
      }),
    })

    setGroups((gs) => gs.map((g) => {
      if (g.attempt_id !== group.attempt_id) return g
      return {
        ...g,
        responses: g.responses.map((r) =>
          r.question_id !== response.question_id ? r
            : { ...r, feedback: { feedback_text: text, updated_at: new Date().toISOString() } }
        ),
      }
    }))

    setSaving((s) => ({ ...s, [key]: false }))
    setSaved((s) => ({ ...s, [key]: true }))
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000)
  }

  const courses = Array.from(new Map(groups.map((g) => [g.course.id, g.course])).values())

  const filteredGroups = groups.filter((g) => {
    if (courseFilter !== 'all' && g.course.id !== courseFilter) return false
    const hasUnreviewed = g.responses.some((r) => !r.feedback)
    if (filter === 'unreviewed') return hasUnreviewed
    if (filter === 'reviewed') return !hasUnreviewed
    return true
  })

  const unreviewedCount = groups.reduce(
    (acc, g) => acc + g.responses.filter((r) => !r.feedback).length,
    0
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: 'var(--text-3)' }}>
      Loading responses…
    </div>
  )

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-3)' }}>Dashboard</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Student responses</span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>Student responses</h1>
          {unreviewedCount > 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>
              {unreviewedCount} unreviewed response{unreviewedCount !== 1 ? 's' : ''}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
              Text responses from assessments with reflection questions.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {courses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Course:</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="input"
                style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
              >
                <option value="all">All courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['unreviewed', 'all', 'reviewed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 0',
          border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-3)', fontSize: 14,
        }}>
          {filter === 'unreviewed' ? 'No unreviewed responses — all caught up! ✓' : 'No responses yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredGroups.map((group) => (
            <div key={group.attempt_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Attempt header */}
              <div style={{
                padding: '0.875rem 1.25rem',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginBottom: 3, fontWeight: 600,
                  }}>
                    {group.course.title}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>
                    {group.assessment.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-2)', marginTop: 4,
                    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    <span>👤 {group.student.full_name || group.student.email}</span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span>
                      {new Date(group.attempted_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <Link
                      href={`/admin/courses/${group.course.slug}`}
                      style={{ color: 'var(--indigo)' }}
                    >
                      View course ↗
                    </Link>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${group.passed ? 'badge-success' : 'badge-danger'}`}>
                    {group.score}% · {group.passed ? 'Passed' : 'Failed'}
                  </span>
                  {group.responses.some((r) => !r.feedback) && (
                    <span className="badge badge-amber">Needs review</span>
                  )}
                </div>
              </div>

              {/* Responses */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {group.responses.map((response) => {
                  const key = `${group.attempt_id}:${response.question_id}`
                  const isReviewed = !!response.feedback
                  return (
                    <div
                      key={response.question_id}
                      style={{
                        paddingLeft: '1rem',
                        borderLeft: `3px solid ${isReviewed ? 'var(--success)' : 'var(--amber)'}`,
                      }}
                    >
                      <QuestionBody response={response} />

                      {/* Student answer — always rendered as plain text */}
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--radius)',
                        fontSize: 14,
                        color: 'var(--text-2)',
                        marginBottom: '0.875rem',
                        fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid var(--border)',
                      }}>
                        {response.answer || (
                          <span style={{ color: 'var(--text-3)' }}>(no response)</span>
                        )}
                      </div>

                      <label style={{
                        display: 'block', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-2)', marginBottom: 6,
                      }}>
                        {isReviewed ? 'Your feedback (click to edit)' : 'Leave feedback'}
                      </label>
                      <textarea
                        className="input"
                        value={feedback[key] ?? ''}
                        onChange={(e) => setFeedback((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder="Type your feedback here…"
                        rows={3}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => saveFeedback(group, response)}
                          disabled={saving[key] || !feedback[key]?.trim()}
                          className="btn btn-primary btn-sm"
                        >
                          {saving[key] ? 'Saving…' : isReviewed ? 'Update feedback' : 'Save feedback'}
                        </button>
                        {saved[key] && (
                          <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Saved</span>
                        )}
                        {isReviewed && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            Updated {new Date(response.feedback!.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default function GradingPage() {
  return (
    <Suspense fallback={<div className="page" style={{ color: 'var(--text-3)' }}>Loading…</div>}>
      <GradingContent />
    </Suspense>
  )
}
