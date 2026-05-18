'use client'

import { useRef, useState } from 'react'

interface Props {
  courseId: string
  title: string
  description: string
  slug: string
  priceCents: number
  thumbnailUrl: string | null
  introDescription: string | null
  conclusionDescription: string | null
  editorTools: string[]
}

const TOOL_OPTIONS = [
  { value: 'math', label: 'LaTeX math formulas', description: 'Inline and block math rendering via KaTeX' },
  { value: 'graph', label: 'Interactive graphs', description: 'Mafs graph editor for plotting functions' },
  { value: 'python-lint', label: 'Python linting', description: 'Heuristic lint checks on Python code blocks' },
  { value: 'terminal', label: 'Terminal blocks', description: 'Styled terminal/bash output blocks' },
  { value: 'lang-select', label: 'Language selector', description: 'Per-block language dropdown on code blocks' },
]

export default function CourseSettings({ courseId, title, description, slug, priceCents, thumbnailUrl, introDescription, conclusionDescription, editorTools }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title, description, slug, priceCents,
    introDescription: introDescription ?? '',
    conclusionDescription: conclusionDescription ?? '',
    editorTools: editorTools ?? [],
  })
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
    setError('')
  }

  async function uploadThumbnail(file: File) {
    setUploading(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload-thumbnail', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) setUploadError(data.error ?? 'Upload failed')
    else setThumbnail(data.url)
    setUploading(false)
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
          thumbnail_url: thumbnail,
          intro_description: form.introDescription || null,
          conclusion_description: form.conclusionDescription || null,
          editor_tools: form.editorTools,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save')
      } else {
        setSaved(true)
        if (form.slug !== slug) {
          window.location.href = `/admin/courses/${form.slug}`
        } else {
          window.location.reload()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm">
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
              >×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span style={labelStyle}>Title</span>
                <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} />
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
                <span style={labelStyle}>Introduction section description <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(optional)</span></span>
                <textarea
                  value={form.introDescription}
                  onChange={(e) => set('introDescription', e.target.value)}
                  rows={2}
                  placeholder="Describe what students will find in the introduction…"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <label>
                <span style={labelStyle}>Conclusion section description <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(optional)</span></span>
                <textarea
                  value={form.conclusionDescription}
                  onChange={(e) => set('conclusionDescription', e.target.value)}
                  rows={2}
                  placeholder="Describe what students will find in the conclusion…"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <div>
                <span style={labelStyle}>Lesson editor tools</span>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 8px' }}>Choose which extended tools are available in the lesson editor for this course.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TOOL_OPTIONS.map((tool) => (
                    <label key={tool.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.editorTools.includes(tool.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.editorTools, tool.value]
                            : form.editorTools.filter((t) => t !== tool.value)
                          set('editorTools', next)
                        }}
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{tool.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{tool.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

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

              {/* Thumbnail */}
              <div>
                <span style={labelStyle}>Thumbnail</span>
                {thumbnail && (
                  <div style={{ marginBottom: 8, position: 'relative' }}>
                    <img
                      src={thumbnail}
                      alt="Course thumbnail"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius)', display: 'block' }}
                    />
                    <button
                      onClick={() => setThumbnail(null)}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: 'var(--radius-full)',
                        width: 24, height: 24, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-ghost btn-sm"
                >
                  {uploading ? 'Uploading…' : thumbnail ? 'Replace image' : 'Upload image'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadThumbnail(file)
                    e.target.value = ''
                  }}
                />
                {uploadError && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0' }}>{uploadError}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '4px 0 0' }}>
                  Recommended: 1280×640px (2:1 ratio). Images are cropped to fit — keep the subject centred. JPEG, PNG, WebP or GIF.
                </p>
              </div>
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
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={save}
                disabled={saving || uploading}
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
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
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
