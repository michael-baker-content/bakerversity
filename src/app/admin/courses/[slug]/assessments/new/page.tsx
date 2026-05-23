'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { AssessmentType } from '@/lib/types'

const ASSESSMENT_TYPES: { value: AssessmentType; label: string; description: string }[] = [
  {
    value: 'quiz',
    label: 'Quiz',
    description: 'A short check within a module. Graded, appears in the module sequence.',
  },
  {
    value: 'exam',
    label: 'Exam',
    description: 'A longer graded assessment, typically at the end of a module or course.',
  },
  {
    value: 'practice',
    label: 'Practice',
    description: 'Ungraded. Students can attempt as many times as needed with no score recorded.',
  },
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz')
  const [passingScore, setPassingScore] = useState(70)
  const [isGraded, setIsGraded] = useState(true)

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search)
    const preModule = qp.get('module')

    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)
        const res = await fetch(`/api/admin/courses/${data.id}/modules`)
        const mods = await res.json()
        setModules(Array.isArray(mods) ? mods : [])
        if (preModule) setModuleId(preModule)
      })
  }, [slug])

  // Keep is_graded in sync: practice is always ungraded
  useEffect(() => {
    if (assessmentType === 'practice') setIsGraded(false)
    else setIsGraded(true)
  }, [assessmentType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        assessment_type: assessmentType,
        module_id: moduleId ?? null,
        is_graded: isGraded,
        passing_score: passingScore,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create assessment')
      setLoading(false)
      return
    }

    const { id } = await res.json()
    router.push(`/admin/courses/${slug}/assessments/${id}`)
  }

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>New assessment</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>New assessment</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Module 2 Quiz"
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
            <p style={hintStyle}>
              Assessments inside a module appear in sequence with lessons.
            </p>
          </div>
        )}

        {/* Assessment type */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ASSESSMENT_TYPES.map((t) => (
              <label
                key={t.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  border: `1px solid ${assessmentType === t.value ? 'var(--indigo)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  background: assessmentType === t.value ? 'var(--indigo-muted)' : 'var(--surface)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="assessment_type"
                  value={t.value}
                  checked={assessmentType === t.value}
                  onChange={() => setAssessmentType(t.value)}
                  style={{ marginTop: 3, accentColor: 'var(--indigo)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.5 }}>
                    {t.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Passing score — only shown for graded types */}
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
              <span>0%</span>
              <span>100%</span>
            </div>
            <p style={hintStyle}>Students must meet or exceed this score to pass.</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading || !title.trim() || !courseId}
            className="btn btn-primary"
          >
            {loading ? 'Saving…' : 'Create assessment'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
}

const hintStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5,
}
