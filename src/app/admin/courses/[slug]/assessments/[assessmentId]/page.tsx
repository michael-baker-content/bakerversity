'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { AssessmentType } from '@/lib/types'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })
const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'text_response'

interface Question {
  id: string
  question_type: QuestionType
  content: Record<string, unknown> | null
  question_text: string | null
  options: string[] | null
  correct_answer: string | null
  accepted_answers: string[] | null
  explanation: string | null
  explanation_content: Record<string, unknown> | null
  position: number
}

interface AssessmentData {
  id: string
  title: string
  slug: string | null
  assessment_type: AssessmentType
  is_graded: boolean
  passing_score: number
  is_published: boolean
  module_id: string | null
  intro_content: Record<string, unknown> | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / false',
  short_answer: 'Short answer',
  text_response: 'Text response',
}

const TYPE_COLORS: Record<QuestionType, { bg: string; color: string }> = {
  multiple_choice: { bg: 'var(--indigo-muted)',  color: 'var(--indigo)' },
  true_false:      { bg: 'var(--amber-muted)',   color: 'var(--amber-hover)' },
  short_answer:    { bg: 'var(--surface-2)',      color: 'var(--text-2)' },
  text_response:   { bg: 'var(--surface-2)',      color: 'var(--text-3)' },
}

function emptyDoc(): Record<string, unknown> {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

function docIsEmpty(doc: Record<string, unknown> | null): boolean {
  if (!doc) return true
  const content = doc.content as unknown[]
  if (!content?.length) return true
  if (content.length === 1) {
    const first = content[0] as Record<string, unknown>
    if (first.type === 'paragraph' && !first.content) return true
  }
  return false
}

// ── QuestionForm ──────────────────────────────────────────────────────────────

interface QuestionFormState {
  question_type: QuestionType
  content: Record<string, unknown>
  options: string[]
  correct_answer: string
  accepted_answers: string[]   // for short_answer
  explanation_content: Record<string, unknown>
}

function emptyForm(): QuestionFormState {
  return {
    question_type: 'multiple_choice',
    content: emptyDoc(),
    options: ['', '', '', ''],
    correct_answer: '0',
    accepted_answers: [''],
    explanation_content: emptyDoc(),
  }
}

function QuestionForm({
  initial,
  assessmentId,
  courseId,
  onSave,
  onCancel,
  saving,
  editorPacks,
}: {
  initial: QuestionFormState
  assessmentId: string
  courseId: string
  onSave: (data: QuestionFormState) => Promise<void>
  onCancel: () => void
  saving: boolean
  editorPacks: string[]
}) {
  const [form, setForm] = useState<QuestionFormState>(initial)
  const [showLatexModal, setShowLatexModal] = useState(false)
  const [latexTarget, setLatexTarget] = useState<'question' | 'explanation'>('question')
  const insertLatexQuestionRef = useRef<((latex: string, display: boolean) => void) | null>(null)
  const insertLatexExplanationRef = useRef<((latex: string, display: boolean) => void) | null>(null)

  const set = <K extends keyof QuestionFormState>(key: K, val: QuestionFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleTypeChange = (t: QuestionType) => {
    setForm((f) => ({
      ...f,
      question_type: t,
      options: t === 'multiple_choice' ? (f.options.length >= 2 ? f.options : ['', '', '', '']) : [],
      correct_answer: t === 'true_false' ? 'true' : t === 'multiple_choice' ? '0' : '',
      accepted_answers: t === 'short_answer' ? (f.accepted_answers.length ? f.accepted_answers : ['']) : [],
    }))
  }

  const setOption = (i: number, val: string) => {
    const next = [...form.options]
    next[i] = val
    set('options', next)
  }

  const addOption = () => set('options', [...form.options, ''])
  const removeOption = (i: number) => {
    const next = form.options.filter((_, idx) => idx !== i)
    set('options', next)
    if (form.correct_answer === String(i)) set('correct_answer', '0')
  }

  const setAccepted = (i: number, val: string) => {
    const next = [...form.accepted_answers]
    next[i] = val
    set('accepted_answers', next)
  }
  const addAccepted = () => set('accepted_answers', [...form.accepted_answers, ''])
  const removeAccepted = (i: number) =>
    set('accepted_answers', form.accepted_answers.filter((_, idx) => idx !== i))

  const canSave = !docIsEmpty(form.content) && (
    form.question_type !== 'short_answer' ||
    form.accepted_answers.some((a) => a.trim())
  )

  const hasMath = editorPacks.includes('math')

  return (
    <>
      {showLatexModal && hasMath && (
        <LatexModal
          onInsert={(latex, displayMode) => {
            if (latexTarget === 'question') insertLatexQuestionRef.current?.(latex, displayMode)
            else insertLatexExplanationRef.current?.(latex, displayMode)
            setShowLatexModal(false)
          }}
          onClose={() => setShowLatexModal(false)}
          showDisplayToggle
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Question type */}
        <div>
          <label style={labelStyle}>Question type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`btn btn-sm ${form.question_type === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {form.question_type === 'text_response' && (
            <p style={hintStyle}>Free-response questions are graded manually in the Responses tab.</p>
          )}
          {form.question_type === 'short_answer' && (
            <p style={hintStyle}>Auto-graded. Student input is trimmed and lowercased before comparison.</p>
          )}
        </div>

        {/* Question body — TipTap */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={labelStyle}>Question</label>
            {hasMath && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setLatexTarget('question'); setShowLatexModal(true) }}
              >
                ∑ Math
              </button>
            )}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <TipTapEditor
              key={`q-body-${initial.question_type}`}
              packs={hasMath ? ['math'] : []}
              content={docIsEmpty(form.content) ? undefined : form.content}
              onChange={(doc) => set('content', doc)}
              onLatexButtonClick={() => { setLatexTarget('question'); setShowLatexModal(true) }}
              onInsertLatex={(fn) => { insertLatexQuestionRef.current = fn }}
            />
          </div>
        </div>

        {/* Multiple choice options */}
        {form.question_type === 'multiple_choice' && (
          <div>
            <label style={labelStyle}>Answer choices</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="correct_answer"
                    checked={form.correct_answer === String(i)}
                    onChange={() => set('correct_answer', String(i))}
                    title="Mark as correct"
                    style={{ accentColor: 'var(--indigo)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 18 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    className="input"
                    type="text"
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    style={{ flex: 1 }}
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                      title="Remove option"
                    >×</button>
                  )}
                </div>
              ))}
              {form.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: 2 }}
                >
                  + Add option
                </button>
              )}
            </div>
            <p style={hintStyle}>Select the radio button next to the correct answer.</p>
          </div>
        )}

        {/* True / false */}
        {form.question_type === 'true_false' && (
          <div>
            <label style={labelStyle}>Correct answer</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['true', 'false'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('correct_answer', val)}
                  className={`btn btn-sm ${form.correct_answer === val ? 'btn-secondary' : 'btn-ghost'}`}
                >
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Short answer — accepted answers */}
        {form.question_type === 'short_answer' && (
          <div>
            <label style={labelStyle}>Accepted answers</label>
            <p style={{ ...hintStyle, marginBottom: 8 }}>
              All values are compared case-insensitively after trimming whitespace. Add multiple entries if several phrasings should be accepted (e.g. "4", "four", "4.0").
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.accepted_answers.map((ans, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    type="text"
                    value={ans}
                    onChange={(e) => setAccepted(i, e.target.value)}
                    placeholder={i === 0 ? 'e.g. 4' : 'Alternative answer…'}
                    style={{ flex: 1 }}
                  />
                  {form.accepted_answers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAccepted(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAccepted}
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: 2 }}
              >
                + Add alternative
              </button>
            </div>
          </div>
        )}

        {/* Explanation — TipTap (not shown for text_response) */}
        {form.question_type !== 'text_response' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Explanation <span style={optStyle}>(shown to student after answering)</span>
              </label>
              {hasMath && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setLatexTarget('explanation'); setShowLatexModal(true) }}
                >
                  ∑ Math
                </button>
              )}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <TipTapEditor
                key={`q-explanation-${initial.question_type}`}
                packs={hasMath ? ['math'] : []}
                content={docIsEmpty(form.explanation_content) ? undefined : form.explanation_content}
                onChange={(doc) => set('explanation_content', doc)}
                onLatexButtonClick={() => { setLatexTarget('explanation'); setShowLatexModal(true) }}
                onInsertLatex={(fn) => { insertLatexExplanationRef.current = fn }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={() => onSave(form)}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving…' : 'Save question'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── QuestionRow — collapsed view of a saved question ─────────────────────────

function QuestionRow({
  question,
  index,
  courseId,
  assessmentId,
  editorPacks,
  onUpdated,
  onDeleted,
}: {
  question: Question
  index: number
  courseId: string
  assessmentId: string
  editorPacks: string[]
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { bg, color } = TYPE_COLORS[question.question_type]

  const handleSave = async (form: QuestionFormState) => {
    setSaving(true)
    const payload: Record<string, unknown> = {
      question_type: form.question_type,
      content: docIsEmpty(form.content) ? null : form.content,
      explanation_content: docIsEmpty(form.explanation_content) ? null : form.explanation_content,
    }

    if (form.question_type === 'multiple_choice') {
      payload.options = form.options.filter((o) => o.trim())
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'true_false') {
      payload.options = ['true', 'false']
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'short_answer') {
      payload.accepted_answers = form.accepted_answers.filter((a) => a.trim())
    }

    await fetch(
      `/api/admin/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this question? This cannot be undone.')) return
    await fetch(
      `/api/admin/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`,
      { method: 'DELETE' }
    )
    onDeleted()
  }

  // Build a plain-text preview from the content doc or question_text fallback
  const preview = (() => {
    if (question.question_text) return question.question_text
    if (!question.content) return '(no question body)'
    try {
      const content = question.content.content as Array<Record<string, unknown>> | undefined
      if (!content) return '(rich content)'
      const firstPara = content.find((n) => n.type === 'paragraph')
      if (!firstPara) return '(rich content)'
      const children = firstPara.content as Array<Record<string, unknown>> | undefined
      if (!children) return '(empty)'
      return children
        .filter((n) => n.type === 'text')
        .map((n) => n.text as string)
        .join('') || '(rich content)'
    } catch {
      return '(rich content)'
    }
  })()

  const initialForm: QuestionFormState = {
    question_type: question.question_type,
    content: question.content ?? emptyDoc(),
    options: question.options ?? ['', '', '', ''],
    correct_answer: question.correct_answer ?? (question.question_type === 'true_false' ? 'true' : '0'),
    accepted_answers: question.accepted_answers ?? [''],
    explanation_content: question.explanation_content ?? emptyDoc(),
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {editing ? (
        <div style={{ padding: '1rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            Editing question {index + 1}
          </p>
          <QuestionForm
            initial={initialForm}
            assessmentId={assessmentId}
            courseId={courseId}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
            editorPacks={editorPacks}
          />
        </div>
      ) : (
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 20, paddingTop: 2 }}>
            {index + 1}.
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 7px',
                borderRadius: 'var(--radius-full)',
                background: bg, color,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {TYPE_LABELS[question.question_type]}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview}
            </p>
            {question.question_type === 'multiple_choice' && question.options && question.correct_answer && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                ✓ {question.options[Number(question.correct_answer)] ?? question.correct_answer}
              </p>
            )}
            {question.question_type === 'true_false' && question.correct_answer && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                ✓ {question.correct_answer.charAt(0).toUpperCase() + question.correct_answer.slice(1)}
              </p>
            )}
            {question.question_type === 'short_answer' && question.accepted_answers && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                Accepted: {question.accepted_answers.join(', ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">Edit</button>
            <button
              onClick={handleDelete}
              className="btn btn-sm"
              style={{ background: 'none', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const courseSlug = params.slug as string
  const assessmentId = params.assessmentId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [editorPacks, setEditorPacks] = useState<string[]>([])
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Assessment settings fields
  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz')
  const [passingScore, setPassingScore] = useState(70)
  const [isGraded, setIsGraded] = useState(true)
  const [isPublished, setIsPublished] = useState(false)
  const [moduleId, setModuleId] = useState<string | null>(null)

  // Intro content TipTap
  const [introContent, setIntroContent] = useState<Record<string, unknown>>(emptyDoc())
  const [ready, setReady] = useState(false)
  const insertLatexIntroRef = useRef<((latex: string, display: boolean) => void) | null>(null)
  const [showLatexIntro, setShowLatexIntro] = useState(false)

  const loadQuestions = useCallback(async (cId: string) => {
    const res = await fetch(`/api/admin/courses/${cId}/assessments/${assessmentId}/questions`)
    const data = await res.json()
    setQuestions(Array.isArray(data) ? data : [])
  }, [assessmentId])

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(courseSlug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)

        const [assessmentRes, modsRes, courseRes, questionsRes] = await Promise.all([
          fetch(`/api/admin/courses/${data.id}/assessments/${assessmentId}`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}/modules`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}/assessments/${assessmentId}/questions`).then((r) => r.json()),
        ])

        setAssessment(assessmentRes)
        setTitle(assessmentRes.title ?? '')
        setAssessmentType(assessmentRes.assessment_type ?? 'quiz')
        setPassingScore(assessmentRes.passing_score ?? 70)
        setIsGraded(assessmentRes.is_graded ?? true)
        setIsPublished(assessmentRes.is_published ?? false)
        setModuleId(assessmentRes.module_id ?? null)
        setIntroContent(assessmentRes.intro_content ?? emptyDoc())
        setModules(Array.isArray(modsRes) ? modsRes : [])
        setEditorPacks(Array.isArray(courseRes.editor_tools) ? courseRes.editor_tools : [])
        setQuestions(Array.isArray(questionsRes) ? questionsRes : [])
        setReady(true)
      })
      .finally(() => setLoading(false))
  }, [courseSlug, assessmentId])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/assessments/${assessmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        assessment_type: assessmentType,
        module_id: moduleId ?? null,
        is_graded: isGraded,
        passing_score: passingScore,
        intro_content: docIsEmpty(introContent) ? null : introContent,
        is_published: isPublished,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    router.push(`/admin/courses/${courseSlug}`)
  }

  const handleAddQuestion = async (form: QuestionFormState) => {
    if (!courseId) return
    setSavingQuestion(true)

    const payload: Record<string, unknown> = {
      question_type: form.question_type,
      content: docIsEmpty(form.content) ? null : form.content,
      explanation_content: docIsEmpty(form.explanation_content) ? null : form.explanation_content,
    }

    if (form.question_type === 'multiple_choice') {
      payload.options = form.options.filter((o) => o.trim())
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'true_false') {
      payload.options = ['true', 'false']
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'short_answer') {
      payload.accepted_answers = form.accepted_answers.filter((a) => a.trim())
    }

    const res = await fetch(`/api/admin/courses/${courseId}/assessments/${assessmentId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setAddingQuestion(false)
      await loadQuestions(courseId)
    }
    setSavingQuestion(false)
  }

  const handleDelete = async () => {
    if (!courseId) return
    if (!confirm(`Delete "${title}"? This will also delete all its questions and cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/admin/courses/${courseId}/assessments/${assessmentId}`, { method: 'DELETE' })
    router.push(`/admin/courses/${courseSlug}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  if (!assessment) return (
    <main className="page">
      <p style={{ color: 'var(--danger)' }}>Assessment not found.</p>
      <Link href={`/admin/courses/${courseSlug}`}>← Back to course</Link>
    </main>
  )

  const typeLabel = assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)

  return (
    <main className="page">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${courseSlug}`} style={{ color: 'var(--text-3)' }}>{courseSlug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit {typeLabel.toLowerCase()}</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit {typeLabel.toLowerCase()}</h1>

      {/* ── Settings form ────────────────────────────────────── */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Module */}
        {modules.length > 0 && (
          <div>
            <label style={labelStyle}>Module</label>
            <select
              className="input"
              value={moduleId ?? ''}
              onChange={(e) => setModuleId(e.target.value || null)}
            >
              <option value="">— No module (course-level) —</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Assessment type */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['quiz', 'exam', 'practice'] as AssessmentType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setAssessmentType(t)
                  if (t === 'practice') setIsGraded(false)
                  else setIsGraded(true)
                }}
                className={`btn btn-sm ${assessmentType === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Passing score */}
        {isGraded && (
          <div>
            <label style={labelStyle}>
              Passing score: <strong>{passingScore}%</strong>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--indigo)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
              <span>0%</span><span>100%</span>
            </div>
          </div>
        )}

        {/* Intro content */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Introduction <span style={optStyle}>(shown before questions, optional)</span>
            </label>
            {editorPacks.includes('math') && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowLatexIntro(true)}
              >
                ∑ Math
              </button>
            )}
          </div>
          {ready && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <TipTapEditor
                key="assessment-intro"
                packs={editorPacks.includes('math') ? ['math'] : []}
                content={docIsEmpty(introContent) ? undefined : introContent}
                onChange={setIntroContent}
                onLatexButtonClick={() => setShowLatexIntro(true)}
                onInsertLatex={(fn) => { insertLatexIntroRef.current = fn }}
              />
            </div>
          )}
        </div>

        {/* Published */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published (visible to enrolled students)
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving || !title || !courseId} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href={`/admin/courses/${courseSlug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {/* ── Questions section ────────────────────────────────── */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontFamily: 'var(--font-serif)' }}>
              Questions
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
              {questions.length} question{questions.length !== 1 ? 's' : ''}
              {isGraded && questions.length > 0 && ` · ${passingScore}% to pass`}
            </p>
          </div>
          {!addingQuestion && (
            <button
              type="button"
              onClick={() => setAddingQuestion(true)}
              className="btn btn-ghost btn-sm"
            >
              + Add question
            </button>
          )}
        </div>

        {/* Question list */}
        {questions.length === 0 && !addingQuestion && (
          <div style={{
            padding: '2rem', textAlign: 'center',
            border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--text-3)', fontSize: 14,
          }}>
            No questions yet. Add your first question above.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: addingQuestion ? '1.5rem' : 0 }}>
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              courseId={courseId ?? ''}
              assessmentId={assessmentId}
              editorPacks={editorPacks}
              onUpdated={() => loadQuestions(courseId ?? '')}
              onDeleted={() => loadQuestions(courseId ?? '')}
            />
          ))}
        </div>

        {/* Add question form */}
        {addingQuestion && (
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            background: 'var(--surface)',
          }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700 }}>
              New question
            </h3>
            <QuestionForm
              initial={emptyForm()}
              assessmentId={assessmentId}
              courseId={courseId ?? ''}
              onSave={handleAddQuestion}
              onCancel={() => setAddingQuestion(false)}
              saving={savingQuestion}
              editorPacks={editorPacks}
            />
          </div>
        )}
      </div>

      {/* ── Danger zone ──────────────────────────────────────── */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Permanently delete this {typeLabel.toLowerCase()} and all its questions.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Deleting…' : `Delete ${typeLabel.toLowerCase()}`}
        </button>
      </div>

      {/* Latex modal for intro content */}
      {showLatexIntro && editorPacks.includes('math') && (
        <LatexModal
          onInsert={(latex, displayMode) => {
            insertLatexIntroRef.current?.(latex, displayMode)
            setShowLatexIntro(false)
          }}
          onClose={() => setShowLatexIntro(false)}
          showDisplayToggle
        />
      )}
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
}
const hintStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5,
}
const optStyle: React.CSSProperties = {
  fontWeight: 400, color: 'var(--text-3)', fontSize: 12,
}
