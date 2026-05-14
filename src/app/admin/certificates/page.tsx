'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Certificate {
  id: string
  issued_at: string
  certificate_url: string | null
  users: { id: string; email: string; full_name: string | null }
  courses: { id: string; title: string; slug: string }
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/admin/certificates')
      .then((r) => r.json())
      .then((d) => setCertificates(d.certificates ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Revoke this certificate? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch('/api/admin/certificates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setCertificates((prev) => prev.filter((c) => c.id !== id))
    setDeleting(null)
  }

  const filtered = certificates.filter((c) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      c.users?.email?.toLowerCase().includes(q) ||
      c.users?.full_name?.toLowerCase().includes(q) ||
      c.courses?.title?.toLowerCase().includes(q)
    )
  })

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)' }}>Certificates</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} issued
          </p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Filter by student or course…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%', maxWidth: 360,
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 14,
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-2)',
        }}>
          {filter ? 'No certificates match that filter.' : 'No certificates issued yet.'}
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {['Student', 'Course', 'Issued', ''].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert, i) => (
                <tr
                  key={cert.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {cert.users?.full_name || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {cert.users?.email}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/admin/courses/${cert.courses?.slug}`}
                      style={{ color: 'var(--indigo)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
                    >
                      {cert.courses?.title}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {cert.issued_at
                      ? new Date(cert.issued_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {cert.certificate_url && (
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          <button className="btn btn-ghost btn-sm">View</button>
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(cert.id)}
                        disabled={deleting === cert.id}
                        className="btn btn-sm"
                        style={{
                          background: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          border: 'none',
                          opacity: deleting === cert.id ? 0.5 : 1,
                        }}
                      >
                        {deleting === cert.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
