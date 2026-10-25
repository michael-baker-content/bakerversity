'use client'
import {useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {requestJson} from '@/lib/authoring/request'
interface Usage {uses:{item_id:string;kind:'lesson'|'page'|'assessment'|'course'|'module'|'video';title:string;state:string}[];history_count:number;removed:boolean;course_slug:string}
export default function AssetUsage({id,title,courseId,removed,disabled,locallySelected,onChanged}:{id:string;title:string;courseId:string;removed:boolean;disabled:boolean;locallySelected:boolean;onChanged:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),heading=useId()
 const [usage,setUsage]=useState<Usage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const endpoint='/api/admin/assets/'+encodeURIComponent(id)+'?course_id='+encodeURIComponent(courseId)
 async function inspect(){
  dialog.current?.showModal();setBusy(true);setError('');setUsage(null)
  try{const result=await requestJson<Usage>(endpoint,{},'usage check');if(!Array.isArray(result.uses))throw Error('Unable to read file usage.');setUsage(result)}
  catch(e){setError(e instanceof Error?e.message:'Unable to check usage.')}
  finally{setBusy(false)}
 }
 const inUse=usage?.uses.some(row=>row.state!=='Archived')||locallySelected
 async function change(){
  if(!usage||busy)return
  if(!usage.removed&&!confirm('Remove “'+title+'” from this course library? You can restore it from Removed files. The stored file and historical references will remain available.'))return
  setBusy(true);setError('')
  try{await requestJson(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({removed:!usage.removed})},'library update');dialog.current?.close();onChanged()}
  catch(e){setError(e instanceof Error?e.message:'Unable to update library.');try{setUsage(await requestJson<Usage>(endpoint))}catch{}}
  finally{setBusy(false)}
 }
 return <>
 <button type="button" className="btn btn-ghost btn-sm" disabled={disabled||busy} onClick={()=>void inspect()}>{removed?'Restore file':'Usage & removal'}</button>
 {typeof document!=='undefined'&&createPortal(<dialog ref={dialog} aria-labelledby={heading} style={{width:'min(560px, calc(100vw - 32px))',maxHeight:'85dvh',overflow:'auto',padding:24,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text)'}}>
 <h2 id={heading} style={{fontSize:20,marginTop:0}}>File usage</h2><p style={{overflowWrap:'anywhere'}}>{title}</p>
 {busy&&!usage&&<p role="status">Checking saved content…</p>}
 {usage&&<>
 <p>{usage.uses.length?'Used in this course:':'No uses found in saved course content.'}</p>
 <ul style={{paddingLeft:20}}>{usage.uses.map(row=><li key={row.item_id+row.state} style={{marginBottom:8}}>
 {row.state==='Archived'||row.kind==='course'||row.kind==='module'||row.kind==='video'?row.title:<a href={'/admin/courses/'+encodeURIComponent(usage.course_slug)+'/'+({lesson:'lessons',page:'pages',assessment:'assessments'}[row.kind])+'/'+row.item_id}>{row.title}</a>}
 {' · '+row.state+' · '+row.kind}</li>)}</ul>
 {usage.history_count>0&&<p>Also retained in {usage.history_count} saved {usage.history_count===1?'revision':'revisions'}.</p>}
 <p style={{fontSize:13,color:'var(--text-2)'}}>Usage includes saved drafts, published content, attached resources, and assessment questions. Unsaved edits in other editors cannot be checked.</p>
 {locallySelected&&<p>This file is selected as a resource in the current editor. Remove that selection and save first.</p>}
 {!usage.removed&&inUse&&<p>Remove the active references and save before removing this file from the library.</p>}
 <p style={{fontSize:13,color:'var(--text-2)'}}>Library removal is reversible. It keeps the stored file, existing URLs, and revision history intact.</p>
 <button type="button" className="btn btn-secondary" disabled={busy||(!usage.removed&&!!inUse)} onClick={()=>void change()}>{busy?'Updating…':usage.removed?'Restore to library':'Remove from library'}</button>
 </>}
 {error&&<p role="alert">{error} {!usage&&<button type="button" onClick={()=>void inspect()}>Retry</button>}</p>}
 <button type="button" className="btn btn-ghost" style={{marginLeft:8}} onClick={()=>dialog.current?.close()}>Close</button>
 </dialog>,document.body)}
 </>
}
