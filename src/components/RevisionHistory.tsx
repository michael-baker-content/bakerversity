'use client'
import { useState } from 'react'
type Revision = { id: string; version: number; created_at: string; snapshot: Record<string, unknown> }
export default function RevisionHistory({ itemId, onRestore }: { itemId: string; onRestore: (snapshot: Record<string, unknown>) => void }) {
  const [rows, setRows] = useState<Revision[] | null>(null)
  const [error, setError] = useState('')
  async function load() {
    try {
      const res = await fetch(`/api/admin/items/${itemId}/history`)
      if (!res.ok) throw new Error('Unable to load revision history')
      setRows(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load history') }
  }
  return <div><button className="btn btn-ghost" type="button" onClick={load}>Revision history</button>{error && <p role="alert">{error}</p>}
    {rows?.some(row => !Array.isArray(row.snapshot.resources)) && <p>Older revisions did not record resource selections. Loading one keeps your current resource selections; review them before publishing.</p>}
    {rows && <div>{rows.length === 0 ? <p>No saved revisions yet.</p> : rows.map(r => <div key={r.id} style={{ display: 'flex', gap: 12, padding: 8 }}><span>Revision {r.version} · {new Date(r.created_at).toLocaleString()}</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => onRestore(r.snapshot)}>Load into editor</button></div>)}<p>Loading a revision does not publish it. Review it, then save a draft or publish.</p></div>}
  </div>
}
