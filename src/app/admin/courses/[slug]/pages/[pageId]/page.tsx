'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

const PAGE_TYPES = [
  { value: 'overview',      label: 'Overview' },
  { value: 'introduction',  label: 'Introduction' },
  { value: 'syllabus',      label: 'Syllabus' },
  { value: 'requirements',  label: 'Requirements' },
  { value: 'resources',     label: 'Resources' },
  { value: 'conclusion',    label: 'Conclusion' },
  { value: 'custom',        label: 'Custom' },
]

const INTRO_TYPES = ['introduction', 'conclusion']

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const pageId = params.pageId as string

  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState('custom')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)
        const [pageRes, modsRes] = await Promise.all([
          fetch(`/api/admin/courses/${data.id}/pages/${pageId}`).then((r) => r.json()),
          fetch(`/api/admin/courses/${data.id}/modules`).then((r) => r.json()),
        ])
        setTitle(pageRes.title ?? '')
        setPageType(pageRes.page_type ?? 'custom')
        setModuleId(pageRes.module_id ?? null)
        setIntroduction(pageRes.introduction ?? '')
        setContent(pageRes.content ?? {})
        setIsPublished(pageRes.is_published ?? false)
        setModules(Array.isArray(modsRes) ? modsRes : [])
        setReady(true)
      })
      .finally(() => setLoading(false))
  }, [slug, pageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        page_type: pageType,
        introduction: introduction || null,
        content,
        is_published: isPublished,
        module_id: moduleId ?? null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    router.push(`/admin/courses/${slug}`)
  }

  const handleDelete = async () => {
    if (!courseId || !confirm('Delete this page? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/admin/courses/${courseId}/pages/${pageId}`, { method: 'DELETE' })
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
        <span style={{ color: 'var(--text-2)' }}>Edit page</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit page</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Page type */}
        <div>
          <label style={labelStyle}>Page type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPageType(t.value)}
                className={`btn btn-sm ${pageType === t.value ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
          {ready && (
            <TipTapEditor
              key="page-editor"
              packs={['code']}
              content={Object.keys(content).length > 0 ? content : undefined}
              onChange={setContent}
              onEditorReady={(fn) => { insertFnRef.current = fn }}
            />
          )}
        </div>

        {/* Published */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published (visible to students)
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving || !title || !courseId} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save page'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Permanently delete this page.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Deleting…' : 'Delete page'}
        </button>
      </div>
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
