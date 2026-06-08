'use client'

import { useState, useEffect, useRef } from 'react'

export interface UnsplashPhoto {
  id: string
  thumb: string
  small: string
  regular: string
  alt: string
  photographer_name: string
  photographer_url: string
  unsplash_url: string
}

interface UnsplashPickerProps {
  onSelect: (photo: UnsplashPhoto) => void
  onClose: () => void
  initialQuery?: string
}

export default function UnsplashPicker({ onSelect, onClose, initialQuery = '' }: UnsplashPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<UnsplashPhoto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<UnsplashPhoto | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initialQuery) search(initialQuery, 1)
  }, [])

  const search = async (q: string, p: number) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/unsplash/search?q=${encodeURIComponent(q)}&page=${p}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results ?? [])
      setTotalPages(data.total_pages ?? 1)
      setPage(p)
      setSelected(null)
    } catch {
      setError('Search failed. Check your Unsplash API key.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selected) return
    // Trigger Unsplash download event as required by API guidelines
    await fetch('/api/admin/unsplash/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_id: selected.id }),
    })
    onSelect(selected)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(query, 1) }}
              placeholder="Search Unsplash photos…"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => search(query, 1)}
              disabled={loading || !query.trim()}
              className="btn btn-primary btn-sm"
            >
              {loading ? '…' : 'Search'}
            </button>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}
          >×</button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 14, textAlign: 'center', margin: '2rem 0' }}>{error}</p>
          )}

          {!loading && results.length === 0 && !error && (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 0', fontSize: 14 }}>
              {query ? 'No results found.' : 'Search for photos above.'}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 0', fontSize: 14 }}>
              Searching…
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
            }}>
              {results.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelected(photo.id === selected?.id ? null : photo)}
                  style={{
                    position: 'relative',
                    padding: 0,
                    border: `3px solid ${selected?.id === photo.id ? 'var(--indigo)' : 'transparent'}`,
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'none',
                    display: 'block',
                    aspectRatio: '3/2',
                  }}
                >
                  <img
                    src={photo.thumb}
                    alt={photo.alt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  {/* Photographer credit overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.55)',
                    fontSize: 10, color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textAlign: 'left',
                  }}>
                    {photo.photographer_name}
                  </div>
                  {selected?.id === photo.id && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 20, height: 20,
                      background: 'var(--indigo)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'white', fontWeight: 700,
                    }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
              <button
                onClick={() => search(query, page - 1)}
                disabled={page <= 1}
                className="btn btn-ghost btn-sm"
              >← Prev</button>
              <span style={{ fontSize: 13, color: 'var(--text-3)', alignSelf: 'center' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => search(query, page + 1)}
                disabled={page >= totalPages}
                className="btn btn-ghost btn-sm"
              >Next →</button>
            </div>
          )}
        </div>

        {/* Footer — selection confirm + attribution note */}
        <div style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
            Photos from{' '}
            <a href="https://unsplash.com/?utm_source=bakerversity&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)' }}>
              Unsplash
            </a>.
            {selected && (
              <> Photo by{' '}
                <a href={selected.photographer_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)' }}>
                  {selected.photographer_name}
                </a>.
              </>
            )}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="btn btn-primary btn-sm"
            >
              Use this photo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
