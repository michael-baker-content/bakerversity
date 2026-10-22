'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
type Item={id:string;kind:string;title:string;module_id:string|null;placement:string;position:number;status:string;is_required:boolean;content_drafts:unknown;has_saved_changes?:boolean}
export default function CourseItemManager({courseId,courseSlug}:{courseId:string;courseSlug:string}) {
  const [items,setItems]=useState<Item[]>([])
  const [modules,setModules]=useState<{id:string;title:string;position:number}[]>([])
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  async function load(){const r=await fetch(`/api/admin/courses/${courseId}/items`);if(!r.ok)throw Error('Unable to load course items');const d=await r.json();setItems(d.items);setModules(d.modules)}
  useEffect(()=>{load().catch(e=>setMessage(e.message))},[courseId])
  async function move(group:Item[],index:number,delta:number){const target=index+delta;if(target<0||target>=group.length)return;setBusy(true);try{const next=[...group];[next[index],next[target]]=[next[target],next[index]];const r=await fetch(`/api/admin/courses/${courseId}/items/reorder`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:next.map((item,position)=>({id:item.id,position}))})});if(!r.ok)throw Error((await r.json()).error);await load();setMessage('Sequence saved.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to reorder')}finally{setBusy(false)}}
  async function restore(item:Item){const r=await fetch(`/api/admin/courses/${courseId}/items`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:item.id})});if(r.ok)await load();else setMessage('Unable to restore item')}
  const groups=[{key:'introduction',title:'Introduction',module:null},...modules.map(m=>({key:m.id,title:m.title,module:m.id})),{key:'body',title:'Course-level content',module:null},{key:'conclusion',title:'Conclusion',module:null}]
  const archived = items.filter(item => item.status === 'archived')
  return (
    <details style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Complete course sequence</summary>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '12px 0 16px' }}>
        All lessons, pages and assessments in one place. Use the arrows to order items within each section.
      </p>
      {message && <p role="status" style={{ fontSize: 13 }}>{message}</p>}
      {groups.map(section => {
        const group = items.filter(item => item.status !== 'archived' && (section.module
          ? item.module_id === section.module
          : !item.module_id && item.placement === section.key))
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
        if (!group.length) return null
        return (
          <details key={section.key} open style={sectionStyle}>
            <summary style={headingStyle}>
              {section.title}
              <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>
                {group.length} {group.length === 1 ? 'item' : 'items'}
              </span>
            </summary>
            <div style={{ padding: '1rem', display: 'grid', gap: 8 }}>
              {group.map((item, index) => {
                const href = `/admin/courses/${courseSlug}/${item.kind === 'lesson' ? 'lessons' : item.kind === 'page' ? 'pages' : 'assessments'}/${item.id}`
                return (
                  <div key={item.id} style={rowStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${item.title} up`} disabled={busy || index === 0} onClick={() => move(group, index, -1)}>▲</button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${item.title} down`} disabled={busy || index === group.length - 1} onClick={() => move(group, index, 1)}>▼</button>
                    </div>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <Link href={href} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflowWrap: 'anywhere' }}>{item.title}</Link>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        <span style={{ ...badgeStyle, background: 'var(--indigo-muted)', color: 'var(--indigo)', textTransform: 'capitalize' }}>{item.kind}</span>
                        <span style={{ ...badgeStyle, textTransform: 'capitalize' }}>{item.status}</span>
                        {item.has_saved_changes && <span style={badgeStyle} title="Saved changes have not been published yet.">Updated</span>}
                        {!item.is_required && <span style={badgeStyle}>Optional</span>}
                      </div>
                    </div>
                    <Link href={href} className="btn btn-ghost btn-sm" aria-label={`Edit ${item.title}`}>Edit</Link>
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
      {archived.length > 0 && (
        <details style={sectionStyle}>
          <summary style={headingStyle}>Archived content <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({archived.length})</span></summary>
          <div style={{ padding: '1rem', display: 'grid', gap: 8 }}>
            {archived.map(item => (
              <div key={item.id} style={rowStyle}>
                <span style={{ flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere', fontSize: 14 }}>{item.title}</span>
                <span style={badgeStyle}>Archived</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => restore(item)}>Restore as draft</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </details>
  )
}

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  overflow: 'hidden', marginBottom: '1rem', background: 'var(--surface)',
}
const headingStyle: React.CSSProperties = {
  padding: '12px 16px', background: 'var(--surface-2)',
  cursor: 'pointer', fontSize: 14, fontWeight: 700,
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
  border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
}
const badgeStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--radius-full)',
  background: 'var(--surface-2)', color: 'var(--text-3)',
}
