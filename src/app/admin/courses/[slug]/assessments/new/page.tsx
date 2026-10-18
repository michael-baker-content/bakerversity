'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { requestJson, AuthoringRequestError } from '@/lib/authoring/request'
import { downloadRecovery } from '@/lib/authoring/recovery'
import { useUnsavedChanges } from '@/lib/authoring/useUnsavedChanges'
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
  const [createUncertain, setCreateUncertain] = useState(false)

  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz')
  const [passingScore, setPassingScore] = useState(70)
  const [isGraded, setIsGraded] = useState(true)

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search)
    const preModule = qp.get('module')

    requestJson<{id:string}>(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)
        const mods = await requestJson<{id:string;title:string}[]>(`/api/admin/courses/${data.id}/modules`)
        setModules(Array.isArray(mods) ? mods : [])
        if (preModule) setModuleId(preModule)
      })
      .catch(error=>setError(error instanceof Error ? error.message : 'Unable to load course.'))
  }, [slug])

  // Keep is_graded in sync: practice is always ungraded
  useEffect(() => {
    if (assessmentType === 'practice') setIsGraded(false)
    else setIsGraded(true)
  }, [assessmentType])

  const creationFields = {title,assessment_type:assessmentType,module_id:moduleId,is_graded:isGraded,passing_score:passingScore}
  useUnsavedChanges(!!title.trim() || createUncertain)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || loading || createUncertain) return
    setLoading(true);setError('')
    try {
      const result=await requestJson<{id:string}>(`/api/admin/courses/${courseId}/assessments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creationFields)},'assessment creation')
      if(!result.id)throw new AuthoringRequestError('Creation could not be confirmed. Download a recovery copy, then check the overview before trying again.',200,true)
      router.push(`/admin/courses/${slug}/assessments/${result.id}`)
    } catch(error) {setError(error instanceof Error ? error.message : 'Unable to create this item.');setCreateUncertain(error instanceof AuthoringRequestError && error.uncertain)}
    finally {setLoading(false)}

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

      <button type="button" className="btn btn-ghost btn-sm" onClick={()=>downloadRecovery('new-item',creationFields)}>Download recovery copy</button>
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
            disabled={loading || createUncertain || !title.trim() || !courseId}
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
