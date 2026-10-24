'use client'
import Link from 'next/link'
import { discardMessage } from '@/lib/authoring/useUnsavedChanges'
import type { useDraft } from '@/lib/authoring/useDraft'
export default function DraftStatus({session,overview}:{session:ReturnType<typeof useDraft>;fields:unknown;kind:string;overview:string}) {
  const blocked=['conflict','uncertain'].includes(session.state.status)
  return <div>
    <p role={blocked || session.state.status==='failed' ? 'alert' : 'status'}>{session.dirty ? 'You have unsaved changes. ' : ''}{session.state.message}</p>
    {blocked&&<p>Use Download → Recovery copy before reloading, then Import from file → Restore recovery copy.</p>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {blocked && <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{if(confirm(discardMessage))window.location.reload()}}>Reload saved version</button>}
      {!session.needsProtection && session.state.status==='saved' && <Link className="btn btn-secondary btn-sm" href={overview}>Back to course overview</Link>}
    </div>
  </div>
}
