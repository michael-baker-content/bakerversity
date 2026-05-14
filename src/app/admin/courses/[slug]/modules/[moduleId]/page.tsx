'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditModulePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const moduleId = params.moduleId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)
        const res = await fetch(`/api/admin/courses/${data.id}/modules`)
        const modules = await res.json()
        const mod = modules.find((m: { id: string }) => m.id === moduleId)
        if (mod) {
          setTitle(mod.title ?? '')
          setDescription(mod.description ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [slug, moduleId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    router.push(`/admin/courses/${slug}`)
  }

  async function handleDelete() {
    if (!courseId) return
    if (!confirm('Delete this module? Lessons in it will become unassigned.')) return
    setDeleting(true)
    await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' })
    router.push(`/admin/courses/${slug}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  return (
    <main className="page" style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit module</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit module</h1>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

        <div>
          <label style={labelStyle}>Description <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description shown on the course page…"
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving || !title} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save module'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {/* Delete */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Deleting this module will unassign all its lessons — they won't be deleted.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Deleting…' : 'Delete module'}
        </button>
      </div>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
}
