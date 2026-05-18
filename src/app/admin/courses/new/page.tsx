'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
  })

  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setForm((f) => ({ ...f, title, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        slug: form.slug,
        description: form.description,
        price_cents: Math.round(parseFloat(form.price) * 100),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create course')
      setLoading(false)
      return
    }

    const { id, slug: newSlug } = await res.json()
    router.push(`/admin/courses/${newSlug ?? id}`)
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/admin/courses" style={{ fontSize: 14, color: '#666' }}>← My courses</Link>
      <h1 style={{ margin: '0.5rem 0 2rem' }}>New course</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Introduction to Algebra"
            required
            style={inputStyle}
          />
        </Field>

        <Field label="URL slug" hint="Used in the course URL: /courses/your-slug" required>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="intro-to-algebra"
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="A complete introduction to algebra with interactive exercises."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <Field label="Price (USD)" hint="Enter 0 for a free course">
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            min="0"
            step="0.01"
            placeholder="49.99"
            style={{ ...inputStyle, width: 120 }}
          />
        </Field>

        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            {loading ? 'Creating...' : 'Create course'}
          </button>
          <Link href="/admin/courses">
            <button type="button" style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  border: '1px solid #ddd',
  borderRadius: 6,
  boxSizing: 'border-box',
}

function Field({ label, hint, required, children }: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        {label}{required && <span style={{ color: 'red' }}> *</span>}
      </label>
      {hint && <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{hint}</p>}
      {children}
    </div>
  )
}
