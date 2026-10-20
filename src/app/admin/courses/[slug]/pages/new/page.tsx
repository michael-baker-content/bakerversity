'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { requestJson, AuthoringRequestError } from '@/lib/authoring/request'
import { downloadRecovery } from '@/lib/authoring/recovery'
import { useUnsavedChanges } from '@/lib/authoring/useUnsavedChanges'
import dynamic from 'next/dynamic'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

const PAGE_TYPES = [
  { value: 'overview',      label: 'Overview',      hint: 'A high-level description of the course' },
  { value: 'introduction',  label: 'Introduction',  hint: 'Welcome students and set expectations' },
  { value: 'syllabus',      label: 'Syllabus',      hint: 'Course schedule, topics, and grading' },
  { value: 'requirements',  label: 'Requirements',  hint: 'Prerequisites and technical requirements' },
  { value: 'resources',     label: 'Resources',     hint: 'Suggested reading, links, bibliography' },
  { value: 'conclusion',    label: 'Conclusion',    hint: 'Wrap up and next steps' },
  { value: 'custom',        label: 'Custom',        hint: 'Any other course-level content' },
]

const INTRO_TYPES = ['introduction', 'conclusion']

export default function NewCoursePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createUncertain, setCreateUncertain] = useState(false)
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState('overview')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})

  useEffect(() => {
    requestJson<{id:string}>(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((data) => { if (data.id) setCourseId(data.id) })
      .catch(() => setError('Could not load course'))
      .finally(() => setResolving(false))
  }, [slug])

  const creationFields = {title,page_type:pageType,introduction,content,module_id:null}
  useUnsavedChanges(!!title.trim() || createUncertain)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || loading || createUncertain) return
    setLoading(true);setError('')
    try {
      const result=await requestJson<{id:string}>(`/api/admin/courses/${courseId}/pages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creationFields)},'page creation')
      if(!result.id)throw new AuthoringRequestError('Creation could not be confirmed. Download a recovery copy, then check the overview before trying again.',200,true)
      router.push(`/admin/courses/${slug}`)
    } catch(error) {setError(error instanceof Error ? error.message : 'Unable to create this item.');setCreateUncertain(error instanceof AuthoringRequestError && error.uncertain)}
    finally {setLoading(false)}

  }

  const selectedType = PAGE_TYPES.find((t) => t.value === pageType)

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>New page</span>
      </div>

      <h1 style={{ margin: '0 0 0.5rem' }}>New course page</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 2rem' }}>
        Course pages appear in the Introduction or Conclusion sections — not inside modules.
      </p>

      <button type="button" className="btn btn-ghost btn-sm" onClick={()=>downloadRecovery('new-item',creationFields)}>Download recovery copy</button>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Page type */}
        <div>
          <label style={labelStyle}>Page type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setPageType(t.value); if (!title) setTitle(t.label) }}
                className={`btn btn-sm ${pageType === t.value ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {selectedType && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0' }}>{selectedType.hint}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {/* Introduction */}
        {INTRO_TYPES.includes(pageType) && (
          <div>
            <label style={labelStyle}>
              Introduction <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>(plain text, shown prominently above content)</span>
            </label>
            <textarea
              className="input"
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={3}
              placeholder="A short paragraph welcoming students..."
            />
          </div>
        )}

        {/* Content */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={labelStyle}>Content</label>
            <MarkdownImport
              hasExistingContent={Object.keys(content).length > 0}
              onInsert={(doc) => insertFnRef.current?.(doc)}
            />
          </div>
          <TipTapEditor courseId={courseId ?? undefined}
            packs={['code']}
            onChange={setContent}
            onEditorReady={(fn) => { insertFnRef.current = fn }}
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={resolving || loading || !title} className="btn btn-primary">
            {resolving ? 'Loading…' : loading ? 'Saving…' : 'Save page'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
