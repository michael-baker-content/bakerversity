'use client'

import { useRef, useState } from 'react'

interface MarkdownImportProps {
  onInsert: (content: Record<string, unknown>) => void
  hasExistingContent?: boolean
}

export default function MarkdownImport({ onInsert, hasExistingContent }: MarkdownImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)

    try {
      // If editor already has content, confirm before replacing
      if (hasExistingContent) {
        const ok = confirm(
          'This will insert the markdown content at the end of the existing lesson. Continue?'
        )
        if (!ok) { setLoading(false); e.target.value = ''; return }
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/parse-markdown', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse file')
        return
      }

      onInsert(data.content)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <details style={{position:'relative'}}>
        <summary className="btn btn-ghost btn-sm" style={{cursor:'pointer'}}>Import from file</summary>
        <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:50,width:'min(260px, calc(100vw - 32px))',padding:12,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--text)',boxShadow:'0 8px 24px #0002'}}>
          <p style={{fontSize:12,margin:'0 0 10px'}}>Markdown (.md, .markdown), MDX (.mdx), or text (.txt).</p>
          <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={event => { fileInputRef.current?.click(); event.currentTarget.closest('details')?.removeAttribute('open') }}>{loading ? 'Parsing…' : 'Choose file'}</button>
        </div>
      </details>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.mdx,.txt,.markdown"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
