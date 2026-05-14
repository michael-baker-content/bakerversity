'use client'

import { useState } from 'react'

interface Props {
  courseId: string
  title: string
  description: string
  slug: string
  priceCents: number
}

export default function CourseSettings({ courseId, title, description, slug, priceCents }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title, description, slug, priceCents })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
    setError('')
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          slug: form.slug,
          price_cents: form.priceCents,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save')
      } else {
        setSaved(true)
        // If slug changed, redirect to new URL
        if (form.slug !== slug) {
          window.location.href = `/admin/courses/${form.slug}`
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm"
        style={{ gap: 6 }}
      >
        ⚙ Settings
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Course settings</h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-2)' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span style={labelStyle}>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={labelStyle}>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <label>
                <span style={labelStyle}>URL slug</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  style={inputStyle}
                />
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
                  /courses/{form.slug}
                </span>
              </label>

              <label>
                <span style={labelStyle}>Price (USD)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-2)', fontSize: 14 }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={(form.priceCents / 100).toFixed(2)}
                    onChange={(e) => set('priceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    style={{ ...inputStyle, width: 100 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Enter 0 for free</span>
                </div>
              </label>
            </div>

            {error && (
              <div style={{
                marginTop: '1rem', padding: '8px 12px',
                background: 'var(--danger-bg)', color: 'var(--danger)',
                borderRadius: 'var(--radius)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  marginBottom: 6, color: 'var(--text)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 14,
  boxSizing: 'border-box',
}
