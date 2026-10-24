'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ModuleForm from '@/components/ModuleForm'

export default function NewModulePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => { if (data.id) setCourseId(data.id) })
      .finally(() => setLoading(false))
  }, [slug])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to create module')
      setSaving(false)
      return
    }
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
        <span style={{ color: 'var(--text-2)' }}>New module</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>New module</h1>

      <ModuleForm title={title} description={description} error={error} saving={saving}
        disabled={!courseId} submitLabel="Add module" autoFocus={true}
        cancelHref={`/admin/courses/${slug}`} onTitleChange={setTitle} onDescriptionChange={setDescription} onSubmit={handleSave} />
    </main>
  )
}
