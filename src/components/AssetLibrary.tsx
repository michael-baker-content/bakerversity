'use client'
import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/authoring/request'
import { resourcePurposes, resourceSelection, type ResourcePurpose, type ResourceSelection } from '@/lib/authoring/resources'

type Asset = { id: string; title: string; url: string; alt_text: string | null; caption?: string | null; mime_type?: string | null; byte_size: number; item_assets: { item_id: string }[] }
interface Props { courseId?: string; value?: ResourceSelection[]; onChange?: (value: ResourceSelection[]) => void; disabled?: boolean }
export default function AssetLibrary({ courseId, value = [], onChange, disabled = false }: Props) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [purpose, setPurpose] = useState<ResourcePurpose>('download')
  const [page,setPage]=useState(0)
  const [hasMore,setHasMore]=useState(false)
  const endpoint=courseId ? '/api/admin/assets?course_id='+encodeURIComponent(courseId) : '/api/admin/assets'
  async function load(next=0) {
    const rows=await requestJson<Asset[]>(endpoint+(courseId?'&page='+next:''))
    setAssets(old=>next===0?rows:[...old,...rows]);setPage(next);setHasMore(!!courseId && rows.length===50)
  }
  useEffect(() => {let active=true;setAssets([]);setMessage('');requestJson<Asset[]>(endpoint).then(rows=>{if(active){setAssets(rows);setPage(0);setHasMore(!!courseId && rows.length===50)}}).catch(e=>{if(active)setMessage(e.message)});return ()=>{active=false}}, [endpoint,courseId])
  async function upload(files: File[]) {
    if (!files.length || busy) return
    setBusy(true)
    const failures:string[]=[];let completed=0
    for(const file of files){
      setMessage('Uploading '+(completed+failures.length+1)+' of '+files.length+': '+file.name)
      try {
        const body=new FormData();body.append('file',file)
        const image=['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)
        await requestJson(endpoint+(courseId?'&':'?')+'kind='+(image?'image':'resource'),{method:'POST',body},'resource upload')
        completed++
      } catch(e){failures.push(file.name+': '+(e instanceof Error?e.message:'Upload failed'))}
    }
    try{await load()}catch{failures.push('Unable to refresh the library. Reload to check uploaded files.')}
    setMessage(completed+' file(s) uploaded.'+(failures.length?' '+failures.join(' '):''));setBusy(false)
  }
  function attach(asset: Asset) {
    if (!onChange) return
    try {
      onChange(resourceSelection([...value, { asset_id: asset.id, purpose }]))
      setMessage('Selection changed. Save the item to keep it as a draft, or publish to make it visible to learners.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to select resource') }
  }
  return <details style={{ margin: '16px 0', padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}><summary>Course asset library</summary>
    <p>Manage images and files for this course. Uploaded files have public URLs. Attaching a file to an item follows that item’s draft and publication settings.</p>
    <input aria-label="Upload course resource" type="file" multiple disabled={busy || disabled || !courseId} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = '' }} />
    {onChange && <>
      <p>Resource selections are saved with this item. Uploading or copying a link does not publish an attachment.</p>
      <label>Resource purpose<select className="input" value={purpose} disabled={disabled} onChange={e => setPurpose(e.target.value as ResourcePurpose)}>{resourcePurposes.map(p => <option key={p}>{p}</option>)}</select></label>
      <h3>Selected resources</h3>
      {value.length === 0 ? <p>No attached resources selected.</p> : <ul>{value.map(row => <li key={`${row.asset_id}:${row.purpose}`}>
        {assets.find(a => a.id === row.asset_id)?.title ?? 'Resource ' + row.asset_id} · {row.purpose}{' '}
        <button type="button" disabled={disabled} onClick={() => {
          onChange(value.filter(r => r.asset_id !== row.asset_id || r.purpose !== row.purpose))
          setMessage('Selection removed locally. Save a draft or publish to apply this change.')
        }}>Remove from item</button>
      </li>)}</ul>}
    </>}
    <p role="status">{message}</p>
    {assets.map(a => <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      {a.mime_type?.startsWith('image/') && <img src={a.url} alt="" loading="lazy" style={{display:'block',maxWidth:160,maxHeight:100,objectFit:'contain',marginBottom:8}} />}
      <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a> · {Math.ceil(a.byte_size / 1024)} KB · {a.mime_type ?? 'File'}{' '}
      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
        try { await navigator.clipboard.writeText(a.url); setMessage('Resource link copied.') }
        catch { setMessage('Unable to copy automatically. Use the resource link instead.') }
      }}>Copy link</button>
      {courseId && a.mime_type?.startsWith('image/') && <ImageDefaults key={a.id} asset={a} endpoint={endpoint} disabled={disabled || busy} onSaved={(alt,caption)=>setAssets(rows=>rows.map(row=>row.id===a.id?{...row,alt_text:alt,caption}:row))} />}
      {onChange && <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || value.some(r => r.asset_id === a.id && r.purpose === purpose)} onClick={() => attach(a)}>
        {value.some(r => r.asset_id === a.id && r.purpose === purpose) ? 'Selected' : 'Select resource'}
      </button>}
    </div>)}
    {hasMore && <button type="button" disabled={busy} onClick={()=>{setBusy(true);load(page+1).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}}>Load more files</button>}
  </details>
}

function ImageDefaults({asset,endpoint,disabled,onSaved}:{asset:Asset;endpoint:string;disabled:boolean;onSaved:(alt:string,caption:string)=>void}) {
 const [alt,setAlt]=useState(asset.alt_text??''),[caption,setCaption]=useState(asset.caption??'')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 return <details style={{margin:'8px 0'}}><summary>Default image descriptions</summary>
 <p>These defaults are stored for future library insertion. Existing lesson images are unchanged.</p>
 <label>Default alt text<input className="input" maxLength={2000} value={alt} disabled={busy||disabled} onChange={e=>setAlt(e.target.value)} /></label>
 <label>Default caption<textarea className="input" maxLength={5000} value={caption} disabled={busy||disabled} onChange={e=>setCaption(e.target.value)} /></label>
 <button type="button" disabled={busy||disabled} onClick={async()=>{setBusy(true);setMessage('');try{await requestJson(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:asset.id,alt_text:alt,caption})},'image defaults save');onSaved(alt,caption);setMessage('Defaults saved.')}catch(e){setMessage(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}}>{busy?'Saving…':'Save defaults'}</button><p role="status">{message}</p>
 </details>
}
