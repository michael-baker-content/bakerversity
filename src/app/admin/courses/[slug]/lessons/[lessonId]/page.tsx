'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import QuizEditor from '@/components/QuizEditor'
import MarkdownImport from '@/components/MarkdownImport'
import type { MafsGraphAttrs } from '@/components/MafsGraph'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })
const MafsGraphEditor = dynamic(() => import('@/components/MafsGraphEditor'), { ssr: false })
const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

const INTRO_TYPES = ['introduction', 'conclusion']

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const lessonParam = params.lessonId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [editorTools, setEditorTools] = useState<string[]>([])
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [lessonUuid, setLessonUuid] = useState<string | null>(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonParam) ? lessonParam : null
  )
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const insertGraphRef = useRef<((attrs: MafsGraphAttrs) => void) | null>(null)
  const insertLatexRef = useRef<((latex: string, displayMode: boolean) => void) | null>(null)
  const [showGraphEditor, setShowGraphEditor] = useState(false)
  const [showLatexModal, setShowLatexModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [lessonSlug, setLessonSlug] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)
  const [slidesUrl, setSlidesUrl] = useState('')
  const [slidesType, setSlidesType] = useState<'pdf' | 'google-slides' | 'none'>('none')
  const [slidesTitle, setSlidesTitle] = useState('')
  const [slidesDescription, setSlidesDescription] = useState('')
  const [slidesUploading, setSlidesUploading] = useState(false)
  const [slidesError, setSlidesError] = useState('')
  const slidesFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonParam)

    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)

        let resolvedLessonId = lessonParam
        if (!isUuid) {
          const res = await fetch(`/api/admin/lesson-id-by-slug?courseId=${data.id}&slug=${encodeURIComponent(lessonParam)}`)
          const lessonData = await res.json()
          if (!lessonData.id) return
          resolvedLessonId = lessonData.id
          setLessonUuid(resolvedLessonId)
        } else {
          setLessonUuid(resolvedLessonId)
        }

        return Promise.all([
          fetch(`/api/admin/courses/${data.id}/lessons/${resolvedLessonId}`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}/modules`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}`).then((r) => r.json()),
        ]).then(([lesson, mods, course]) => {
            setTitle(lesson.title ?? '')
            setLessonSlug(lesson.slug ?? '')
            setIntroduction(lesson.introduction ?? '')
            setContent(lesson.content ?? {})
            setIsPublished(lesson.is_published ?? false)
            setModuleId(lesson.module_id ?? null)
            setModules(Array.isArray(mods) ? mods : [])
            setEditorTools(Array.isArray(course.editor_tools) ? course.editor_tools : [])
            setSlidesTitle(lesson.slides_meta?.title ?? '')
            setSlidesDescription(lesson.slides_meta?.description ?? '')
            const url = lesson.slides_url ?? ''
            setSlidesUrl(url)
            if (url.includes('docs.google.com')) setSlidesType('google-slides')
            else if (url) setSlidesType('pdf')
            else setSlidesType('none')
            setReady(true)
          })
      })
      .finally(() => setLoading(false))
  }, [slug, lessonParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !lessonUuid) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonUuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug: lessonSlug || undefined,
        introduction: introduction || null,
        content,
        is_published: isPublished,
        module_id: moduleId ?? null,
        slides_url: slidesUrl || null,
        slides_meta: (slidesTitle || slidesDescription) ? {
          title: slidesTitle || undefined,
          filename: slidesUrl ? slidesUrl.split('/').pop() : undefined,
          description: slidesDescription || undefined,
        } : null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save lesson')
      setSaving(false)
      return
    }
    router.push(`/admin/courses/${slug}`)
  }

  const handleDelete = async () => {
    if (!courseId || !lessonUuid) return
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/admin/courses/${courseId}/lessons/${lessonUuid}`, { method: 'DELETE' })
    router.push(`/admin/courses/${slug}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit lesson</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit lesson</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {/* Slug */}
        <div>
          <label style={labelStyle}>URL slug</label>
          <input
            className="input"
            type="text"
            value={lessonSlug}
            onChange={(e) => setLessonSlug(e.target.value)}
            placeholder="auto-generated from title"
          />
          <p style={hintStyle}>Used in the lesson URL: /courses/{slug}/lessons/{lessonSlug || 'your-slug'}</p>
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
              <option value="">— No module —</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Introduction */}
        <div>
          <label style={labelStyle}>Introduction <span style={optStyle}>(plain text, shown above content)</span></label>
          <textarea className="input" value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={3} />
        </div>

        {/* Content */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Content</label>
            <MarkdownImport
              hasExistingContent={Object.keys(content).length > 0}
              onInsert={(doc) => insertFnRef.current?.(doc)}
            />
          </div>
          {ready && (
            <TipTapEditor
              key="lesson-editor"
              packs={(['code', ...editorTools] as import('@/components/TipTapEditor').EditorPack[])}
              content={Object.keys(content).length > 0 ? content : undefined}
              onChange={setContent}
              onEditorReady={(fn) => { insertFnRef.current = fn }}
              onGraphButtonClick={() => setShowGraphEditor(true)}
              onInsertGraph={(fn) => { insertGraphRef.current = fn }}
              onLatexButtonClick={() => setShowLatexModal(true)}
              onInsertLatex={(fn) => { insertLatexRef.current = fn }}
            />
          )}
        </div>

        {/* Slides */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <label style={labelStyle}>Slides <span style={optStyle}>(optional)</span></label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {(['none', 'pdf', 'google-slides'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setSlidesType(t); if (t === 'none') setSlidesUrl('') }}
                className={`btn btn-sm ${slidesType === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t === 'none' ? 'None' : t === 'pdf' ? 'Upload PDF' : 'Google Slides'}
              </button>
            ))}
          </div>

          {slidesType === 'pdf' && (
            <div>
              {slidesUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ PDF uploaded</span>
                  <a href={slidesUrl} target="_blank" style={{ fontSize: 12, color: 'var(--indigo)' }}>View ↗</a>
                  <button type="button" onClick={() => setSlidesUrl('')}
                    style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              )}
              <button type="button" onClick={() => slidesFileRef.current?.click()}
                disabled={slidesUploading} className="btn btn-ghost btn-sm">
                {slidesUploading ? 'Uploading…' : slidesUrl ? 'Replace PDF' : 'Choose PDF'}
              </button>
              <input ref={slidesFileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setSlidesUploading(true); setSlidesError('')
                  const fd = new FormData(); fd.append('file', file)
                  const res = await fetch('/api/admin/upload-slides', { method: 'POST', body: fd })
                  const data = await res.json()
                  if (!res.ok) setSlidesError(data.error ?? 'Upload failed')
                  else setSlidesUrl(data.url)
                  setSlidesUploading(false); e.target.value = ''
                }} />
              {slidesError && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '6px 0 0' }}>{slidesError}</p>}
            </div>
          )}

          {slidesType === 'google-slides' && (
            <div>
              <input className="input" type="url" value={slidesUrl} onChange={(e) => setSlidesUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/d/..." />
              <p style={hintStyle}>Paste the URL from File → Share → Publish to web in Google Slides.</p>
            </div>
          )}

          {slidesType !== 'none' && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontWeight: 400, color: 'var(--text-2)' }}>Slides title <span style={optStyle}>(optional)</span></label>
                <input className="input" type="text" value={slidesTitle} onChange={(e) => setSlidesTitle(e.target.value)} placeholder="e.g. Unit 1 Overview" />
              </div>
              <div>
                <label style={{ ...labelStyle, fontWeight: 400, color: 'var(--text-2)' }}>Slides description <span style={optStyle}>(optional)</span></label>
                <textarea className="input" value={slidesDescription} onChange={(e) => setSlidesDescription(e.target.value)}
                  rows={2} placeholder="Brief description of what these slides cover…" />
              </div>
            </div>
          )}
        </div>

        {/* Published */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published (visible to enrolled students)
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, paddingTop: '0.5rem' }}>
          <button type="submit" disabled={saving || !title || !courseId} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save lesson'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {ready && courseId && lessonUuid && (
        <QuizEditor courseId={courseId} lessonId={lessonUuid} />
      )}

      {/* Delete */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Permanently delete this lesson and all its quiz questions.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Deleting…' : 'Delete lesson'}
        </button>
      </div>
      {/* Latex modal — lives at page level to avoid re-render instability */}
      {showLatexModal && editorTools.includes('math') && (
        <LatexModal
          onInsert={(latex, displayMode) => {
            insertLatexRef.current?.(latex, displayMode)
          }}
          onClose={() => setShowLatexModal(false)}
          showDisplayToggle
        />
      )}

      {/* Graph editor modal — lives at page level to avoid re-render instability */}
      {showGraphEditor && editorTools.includes('graph') && (
        <MafsGraphEditor
          onSave={(attrs) => {
            insertGraphRef.current?.(attrs)
            setShowGraphEditor(false)
          }}
          onClose={() => setShowGraphEditor(false)}
        />
      )}
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }
const optStyle: React.CSSProperties = { fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }
