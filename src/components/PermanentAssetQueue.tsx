'use client'
import {useEffect,useRef,useState} from 'react'
import {AuthoringRequestError,requestJson} from '@/lib/authoring/request'
type FileRow={id:string;title:string;blocked:boolean;pending:boolean;eligible_at:string|null;history_count:number;courses:{id:string;title:string;removed_at:string|null}[];uses:{item_id:string;title:string;course_title:string;state:string}[]}
type Queue={items:FileRow[];courses:{id:string;title:string}[];total:number}
export default function PermanentAssetQueue(){
 const [data,setData]=useState<Queue>({items:[],courses:[],total:0}),[course,setCourse]=useState(''),[page,setPage]=useState(0),[reload,setReload]=useState(0)
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[selected,setSelected]=useState<FileRow|null>(null),[confirmation,setConfirmation]=useState(''),[override,setOverride]=useState(false),[message,setMessage]=useState('')
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{let stale=false;setLoading(true);setError('');requestJson<Queue>(`/api/admin/asset-deletions?${new URLSearchParams({course_id:course,page:String(page)})}`).then(value=>{if(!stale)setData(value)}).catch(e=>{if(!stale)setError(e.message)}).finally(()=>{if(!stale)setLoading(false)});return()=>{stale=true}},[course,page,reload])
 function open(file:FileRow){setSelected(file);setConfirmation('');setOverride(false);setMessage('');dialog.current?.showModal()}
 const historical=!!selected&&(selected.history_count>0||selected.uses.some(use=>use.state==='Archived'))
 async function remove(){if(!selected)return;setBusy(true);setMessage('');try{await requestJson('/api/admin/asset-deletions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({asset_id:selected.id,confirmation,override_history:override})},'delete');dialog.current?.close();setSelected(null);setReload(n=>n+1)}catch(e){setMessage(e instanceof AuthoringRequestError&&e.status===0?'The deletion response was lost. Close this dialog and refresh the queue to check whether deletion finished.':e instanceof Error?e.message:'Unable to delete file.')}finally{setBusy(false)}}
 return <>
 <p>Files must be removed from every course library for 30 days. Current drafts and published content always prevent deletion.</p>
 <label>Course<select className="input" value={course} disabled={busy} onChange={e=>{setCourse(e.target.value);setPage(0)}}><option value="">All courses</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
 <button type="button" className="btn btn-ghost" disabled={loading||busy} onClick={()=>setReload(n=>n+1)}>Refresh</button>
 {error&&<p role="alert">{error}</p>}{loading?<p role="status">Checking removed files…</p>:!error&&<>
 <p>{data.total} removed {data.total===1?'file':'files'}</p>
 {data.items.map(file=><article key={file.id} className="card" style={{marginBottom:12}}>
 <h2 style={{fontSize:18,overflowWrap:'anywhere'}}>{file.title}</h2>
 <ul>{file.courses.map(c=><li key={c.id}>{c.title} — {c.removed_at?'Removed '+new Date(c.removed_at).toLocaleDateString():'Still in library'}</li>)}</ul>
 <p>{file.pending?'Deletion started — retry to finish.':file.eligible_at?'Waiting period ends '+new Date(file.eligible_at).toLocaleString():'Not eligible for deletion.'}</p>
 {file.uses.length>0&&<details><summary>Referenced by {file.uses.length} saved content entries</summary><ul>{file.uses.map((u,i)=><li key={i}>{u.course_title}: {u.title} ({u.state})</li>)}</ul></details>}
 {file.history_count>0&&<p>{file.history_count} older {file.history_count===1?'revision references':'revisions reference'} this file.</p>}
 {file.blocked&&!file.pending&&<p>Deletion is blocked by the waiting period, an active library entry, or current content.</p>}
 <button type="button" className="btn btn-secondary" disabled={busy||file.blocked&&!file.pending} onClick={()=>open(file)}>{file.pending?'Retry deletion':'Review permanent deletion'}</button>
 </article>)}
 <div style={{display:'flex',gap:12}}><button className="btn btn-ghost" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><button className="btn btn-ghost" disabled={(page+1)*25>=data.total} onClick={()=>setPage(n=>n+1)}>Next</button></div>
 </>}
 <dialog ref={dialog} aria-labelledby="asset-delete-title" onCancel={e=>{if(busy)e.preventDefault()}} style={{maxWidth:560,width:'calc(100% - 32px)',maxHeight:'85vh',overflowY:'auto',background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:12,padding:24}}>
 <h2 id="asset-delete-title">Permanently delete file</h2>
 <p>This deletes the stored upload and its entries from all course libraries. It cannot be undone. For externally hosted images, only Bakerversity’s record is deleted.</p>
 {historical&&<label style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:16}}><input type="checkbox" checked={override} disabled={busy} onChange={e=>setOverride(e.target.checked)}/><span>I understand that older revisions and archived content will lose access to this file. Restoring them may show broken images or downloads.</span></label>}
 <label>Type <strong style={{overflowWrap:'anywhere'}}>{selected?.title}</strong> to confirm<input className="input" autoComplete="off" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/></label>
 {message&&<p role="alert">{message}</p>}
 <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy||confirmation!==selected?.title||historical&&!override} onClick={()=>void remove()}>{busy?'Deleting…':'Delete permanently'}</button></div>
 </dialog>
 </>
}
