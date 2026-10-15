'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
type Item={id:string;kind:string;title:string;module_id:string|null;placement:string;position:number;status:string;is_required:boolean;content_drafts:unknown}
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
  return <details open style={{padding:16,border:'1px solid var(--border)',borderRadius:8,marginBottom:16}}><summary>Complete course sequence</summary><p>All lessons, pages and assessments. Use the controls below to order items within each section.</p><p role="status">{message}</p>
    {groups.map(g=>{const group=items.filter(i=>i.status!=='archived'&&(g.module?i.module_id===g.module:!i.module_id&&i.placement===g.key)).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));return group.length?<div key={g.key}><h3>{g.title}</h3>{group.map((i,index)=><div key={i.id} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 0'}}><Link style={{flex:1}} href={`/admin/courses/${courseSlug}/${i.kind==='lesson'?'lessons':i.kind==='page'?'pages':'assessments'}/${i.id}`}>{i.title}</Link><small>{i.kind} · {i.status}{i.content_drafts?' · Saved draft':''}{!i.is_required?' · Optional':''}</small><button type="button" aria-label={`Move ${i.title} up`} disabled={busy||index===0} onClick={()=>move(group,index,-1)}>↑</button><button type="button" aria-label={`Move ${i.title} down`} disabled={busy||index===group.length-1} onClick={()=>move(group,index,1)}>↓</button></div>)}</div>:null})}
    {items.filter(i=>i.status==='archived').map(i=><div key={i.id}>{i.title} · Archived <button type="button" onClick={()=>restore(i)}>Restore as draft</button></div>)}
  </details>
}
