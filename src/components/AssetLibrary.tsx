'use client'
import { useEffect, useState, useRef, useId } from 'react'
import { useUnsavedChanges } from '@/lib/authoring/useUnsavedChanges'
import { requestJson } from '@/lib/authoring/request'
import { resourcePurposes, resourceSelection, type ResourcePurpose, type ResourceSelection } from '@/lib/authoring/resources'

export type Asset = { id: string; title: string; download_url?: string | null; original_filename?: string | null; url: string; alt_text: string | null; caption?: string | null; mime_type?: string | null; byte_size: number; item_assets: { item_id: string }[] }
type DescriptionDraft = {name:string;alt:string;caption:string}
type LibraryResults = Asset[] | {items:Asset[];total:number;courseTotal:number}
function unpackResults(result:LibraryResults) {
  if(Array.isArray(result))return {items:result,total:null,courseTotal:null}
  if(!Array.isArray(result.items)||!Number.isInteger(result.total)||!Number.isInteger(result.courseTotal))throw new Error('Unable to read library results.')
  return result
}
interface Props { onPendingChanges?: (pending:boolean)=>void; onPickImage?: (asset:Asset)=>void; initiallyOpen?: boolean; courseId?: string; value?: ResourceSelection[]; onChange?: (value: ResourceSelection[]) => void; disabled?: boolean }
export default function AssetLibrary({ onPendingChanges, onPickImage, initiallyOpen = false, courseId, value = [], onChange, disabled = false }: Props) {
  const labelId = useId()
  const [descriptionDrafts,setDescriptionDrafts]=useState<Record<string,DescriptionDraft>>({})
  const hasDescriptionEdits=Object.keys(descriptionDrafts).length>0
  useUnsavedChanges(hasDescriptionEdits)
  useEffect(()=>{onPendingChanges?.(hasDescriptionEdits)},[hasDescriptionEdits,onPendingChanges])
  const [total,setTotal]=useState<number|null>(null)
  const [courseTotal,setCourseTotal]=useState<number|null>(null)
  const [search,setSearch]=useState('')
  const [query,setQuery]=useState('')
  const [fileType,setFileType]=useState('all')
  const [sort,setSort]=useState('newest')
  const [loading,setLoading]=useState(false)
  const [loadError,setLoadError]=useState('')
  const [reload,setReload]=useState(0)
  const knownNames=useRef<Record<string,string>>({})
  const [view,setView]=useState<'tiles'|'list'>('tiles')
  useEffect(()=>{try{const saved=localStorage.getItem('bakerversity.asset-view');if(saved==='tiles'||saved==='list')setView(saved)}catch{}},[])
  function chooseView(next:'tiles'|'list'){setView(next);try{localStorage.setItem('bakerversity.asset-view',next)}catch{}}
  const [assets, setAssets] = useState<Asset[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(()=>{
    if(busy)return
    const timer=setTimeout(()=>setQuery(search.trim()),300)
    return ()=>clearTimeout(timer)
  },[search,busy])

  const [purpose, setPurpose] = useState<ResourcePurpose>('download')
  const [page,setPage]=useState(0)
  const [hasMore,setHasMore]=useState(false)
  const endpoint=courseId ? '/api/admin/assets?course_id='+encodeURIComponent(courseId) : '/api/admin/assets'
  const listEndpoint=endpoint+(courseId?'&':'?')+new URLSearchParams({q:query,type:fileType,sort,summary:'1'}).toString()
  const currentEndpoint=useRef(listEndpoint);currentEndpoint.current=listEndpoint
  function remember(rows:Asset[]){for(const row of rows)knownNames.current[row.id]=row.title}
  async function load(next=0) {
    const result=unpackResults(await requestJson<LibraryResults>(listEndpoint+'&page='+next,{},'library load'))
    const rows=result.items
    if(currentEndpoint.current!==listEndpoint)return
    remember(rows)
    setAssets(old=>next===0?rows:[...old,...rows]);setPage(next);setTotal(result.total);setCourseTotal(result.courseTotal);setHasMore(result.total===null?!!courseId&&rows.length===50:(next+1)*50<result.total)
  }
  useEffect(()=>{
    let active=true;const controller=new AbortController()
    setAssets([]);setTotal(null);setCourseTotal(null);setHasMore(false);setLoading(true);setLoadError('')
    requestJson<LibraryResults>(listEndpoint,{signal:controller.signal},'library load').then(response=>{if(active){const result=unpackResults(response),rows=result.items;remember(rows);setAssets(rows);setPage(0);setTotal(result.total);setCourseTotal(result.courseTotal);setHasMore(result.total===null?!!courseId&&rows.length===50:rows.length<result.total)}}).catch(e=>{if(active)setLoadError(e.message)}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false;controller.abort()}
  },[listEndpoint,courseId,reload])
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
  return <details open={initiallyOpen || undefined} style={{ margin: '16px 0', padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}><summary>Course asset library</summary>
    <p>Manage images and files for this course. Uploaded files have public URLs. Attaching a file to an item follows that item’s draft and publication settings.</p>
    <input aria-label="Upload course resource" type="file" multiple disabled={busy || disabled || !courseId} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = '' }} />
    {onChange && <>
      <p>Resource selections are saved with this item. Uploading or copying a link does not publish an attachment.</p>
      <label><span id={labelId+'-purpose'}>Resource purpose</span><select aria-labelledby={labelId+'-purpose'} className="input" value={purpose} disabled={disabled} onChange={e => setPurpose(e.target.value as ResourcePurpose)}>{resourcePurposes.map(p => <option key={p}>{p}</option>)}</select></label>
      <h3>Selected resources</h3>
      {value.length === 0 ? <p>No attached resources selected.</p> : <ul>{value.map(row => <li key={`${row.asset_id}:${row.purpose}`}>
        {assets.find(a => a.id === row.asset_id)?.title ?? knownNames.current[row.asset_id] ?? 'Resource ' + row.asset_id} · {row.purpose}{' '}
        <button type="button" disabled={disabled} onClick={() => {
          onChange(value.filter(r => r.asset_id !== row.asset_id || r.purpose !== row.purpose))
          setMessage('Selection removed locally. Save a draft or publish to apply this change.')
        }}>Remove from item</button>
      </li>)}</ul>}
    </>}
    <p role="status">{message}</p>
    {courseId && <div className="asset-search-controls">
      <label>Search files<input className="input" type="search" maxLength={200} placeholder="Name or filename" value={search} disabled={busy} onChange={e=>{setSearch(e.target.value);if(!e.target.value)setQuery('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setQuery(search.trim())}}} /></label>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setQuery(search.trim())}>Search</button>
      <label><span id={labelId+'-type'}>File type</span><select aria-labelledby={labelId+'-type'} className="input" value={fileType} disabled={busy} onChange={e=>setFileType(e.target.value)}><option value="all">All files</option><option value="images">Images</option><option value="pdf">PDFs</option><option value="other">Other files</option></select></label>
      <label><span id={labelId+'-sort'}>Sort</span><select aria-labelledby={labelId+'-sort'} className="input" value={sort} disabled={busy} onChange={e=>setSort(e.target.value)}><option value="newest">Newest uploaded</option><option value="oldest">Oldest uploaded</option><option value="name">Name A–Z</option></select></label>
      {(search||query||fileType!=='all'||sort!=='newest')&&<button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>{setSearch('');setQuery('');setFileType('all');setSort('newest')}}>Reset</button>}
    </div>}
    {loading && <p role="status">Loading files…</p>}
    {loadError && <p role="alert">{loadError} <button type="button" onClick={()=>setReload(n=>n+1)}>Retry</button></p>}
    {!loading&&!loadError&&total!==null&&<p role="status" style={{fontSize:12,color:'var(--text-2)'}}>{assets.length} of {total} matching {total===1?'file':'files'}{courseTotal!==total?' · '+courseTotal+' in course':''}</p>}
    {!loading&&!loadError&&!assets.length&&<p>{query||fileType!=='all'?'No files match these filters.':'No files in this course library yet.'} {(query||fileType!=='all')&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>{setSearch('');setQuery('');setFileType('all')}}>Clear filters</button>}</p>}
    <div role="group" aria-label="Library view" style={{display:'flex',gap:6,margin:'12px 0'}}>
      <button type="button" className={'btn btn-sm '+(view==='tiles'?'btn-secondary':'btn-ghost')} aria-pressed={view==='tiles'} onClick={()=>chooseView('tiles')}>Tiles</button>
      <button type="button" className={'btn btn-sm '+(view==='list'?'btn-secondary':'btn-ghost')} aria-pressed={view==='list'} onClick={()=>chooseView('list')}>Text list</button>
    </div>
    <div className={'asset-browser asset-browser--'+view}>
    {assets.map(a => {
      const draftKey=(courseId??'')+':'+a.id
      const isImage=!!a.mime_type?.startsWith('image/')
      const filename=a.original_filename || a.title
      const extension=filename.includes('.') ? filename.split('.').pop()!.slice(0,12).toUpperCase() : 'FILE'
      return <article key={a.id} className="asset-browser-card">
        <details className="asset-browser-details">
          <summary className="asset-browser-summary">
            <div className="asset-browser-preview" aria-hidden="true">
              {isImage ? <img src={a.url} alt="" loading="lazy" /> : <span className="asset-browser-extension">{extension}</span>}
            </div>
            <span className="asset-browser-name" title={a.title}>{a.title}</span>
            <span className="asset-browser-disclosure" aria-hidden="true"><span className="asset-expand-hint">Expand</span><span className="asset-collapse-hint">Collapse</span></span>
          </summary>
          <div className="asset-browser-options">
            <div className="asset-file-meta"><span>{extension === 'FILE' && isImage ? 'Image' : extension}</span><span>{a.byte_size < 1048576 ? Math.max(1,Math.ceil(a.byte_size/1024))+' KB' : (a.byte_size/1048576).toFixed(1)+' MB'}</span></div>
            {courseId && <AssetDetails asset={a} draft={descriptionDrafts[draftKey]} onDraft={draft=>setDescriptionDrafts(current=>{const next={...current};if(draft)next[draftKey]=draft;else delete next[draftKey];return next})} endpoint={endpoint} disabled={disabled||busy} onSaved={(name,alt,caption)=>{knownNames.current[a.id]=name;setAssets(rows=>rows.map(row=>row.id===a.id?{...row,title:name,alt_text:alt,caption}:row));setDescriptionDrafts(current=>{const next={...current};delete next[draftKey];return next})}} />}
            <div className="asset-file-actions">
              {a.download_url&&<a className="btn btn-ghost btn-sm" href={a.download_url}>Download</a>}
        {onPickImage && isImage && <button type="button" className="btn btn-primary btn-sm asset-browser-use" disabled={disabled||busy||!!descriptionDrafts[draftKey]} title={descriptionDrafts[draftKey]?'Save or discard the asset details before using this image':undefined} onClick={()=>onPickImage(a)}>Use image</button>}
              <a className="btn btn-ghost btn-sm" href={a.url} target="_blank" rel="noreferrer">Open file ↗</a>
              <button type="button" className="btn btn-ghost btn-sm" onClick={async()=>{
                try{await navigator.clipboard.writeText(a.url);setMessage('Resource link copied.')}
                catch{setMessage('Unable to copy automatically. Use Open file instead.')}
              }}>Copy link</button>
            {onChange && <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || value.some(r=>r.asset_id===a.id && r.purpose===purpose)} onClick={()=>attach(a)}>{value.some(r=>r.asset_id===a.id && r.purpose===purpose)?'Selected':'Select resource'}</button>}
            </div>
          </div>
        </details>
      </article>
    })}
    </div>
    <style>{`
      .asset-search-controls {display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:16px 0}
      .asset-search-controls label {display:grid;gap:4px;font-size:12px;color:var(--text-2);min-width:120px;flex:1}
      .asset-search-controls label:first-child {flex:2;min-width:min(200px,100%)}
      .asset-search-controls .input {width:100%;box-sizing:border-box}
      .asset-browser {display:grid;gap:12px;align-items:start;margin-bottom:12px}
      .asset-browser--tiles {grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr))}
      .asset-browser--list {grid-template-columns:minmax(0,1fr)}
      .asset-browser-card {min-width:0;border:1px solid var(--border);border-radius:10px;background:var(--surface);overflow:hidden}
      .asset-browser-summary {padding:12px;cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      .asset-browser-summary::-webkit-details-marker {display:none}
      .asset-browser-summary:focus-visible {outline:2px solid var(--indigo);outline-offset:-3px}
      .asset-browser-preview {width:100%;height:120px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);border-radius:6px;overflow:hidden}
      .asset-browser-preview img {width:100%;height:100%;object-fit:contain}
      .asset-browser-extension {font-size:20px;font-weight:700;letter-spacing:.06em;color:var(--text-2);padding:12px;overflow-wrap:anywhere}
      .asset-browser-name {font-size:13px;font-weight:600;color:var(--text);min-width:0;flex:1;overflow-wrap:anywhere}
      .asset-browser-disclosure {font-size:11px;color:var(--text-2);opacity:0;pointer-events:none}
      .asset-browser-summary:hover .asset-browser-disclosure, .asset-browser-summary:focus-visible .asset-browser-disclosure {opacity:1}
      .asset-browser-summary:hover {background:var(--surface-2)}
      .asset-collapse-hint {display:none}
      .asset-browser-details[open] .asset-expand-hint {display:none}
      .asset-browser-details[open] .asset-collapse-hint {display:inline}
      .asset-browser-options {padding:0 12px 12px;border-top:1px solid var(--border);overflow-wrap:anywhere}
      .asset-browser-use {margin:0}
      .asset-file-actions {display:flex;gap:8px;align-items:center;flex-wrap:nowrap;overflow-x:auto}
      .asset-file-actions > * {flex-shrink:0}
      .asset-file-meta {display:flex;gap:8px;align-items:center;margin:12px 0;color:var(--text-2);font-size:12px}
      .asset-file-meta span:first-child {padding:3px 7px;border-radius:4px;background:var(--surface-2);font-weight:600}
      .asset-description-editor {display:grid;gap:12px;padding:4px 0 16px;margin-bottom:16px;border-bottom:1px solid var(--border)}
      .asset-description-editor h4 {margin:0;font-size:14px;color:var(--text)}
      .asset-description-hint {margin:0;font-size:12px;line-height:1.5;color:var(--text-2)}
      .asset-description-editor label {display:block;font-size:13px;font-weight:600;color:var(--text)}
      .asset-field-hint {display:block;font-weight:400;font-size:12px;color:var(--text-2);margin-top:4px}
      .asset-field-optional {font-weight:400;color:var(--text-2)}
      .asset-description-editor textarea {display:block;width:100%;box-sizing:border-box;resize:vertical;margin-top:6px;font-weight:400;min-height:72px}
      .asset-description-editor button {justify-self:start}
      .asset-description-status {margin:0;font-size:12px;color:var(--text-2)}
      .asset-description-status:empty {display:none}
      .asset-browser--tiles .asset-browser-card:has(>details[open]) {grid-column:1 / -1}
      .asset-browser--tiles .asset-browser-details[open] .asset-browser-preview {height:180px}
      @media(min-width:540px) {.asset-description-editor {grid-template-columns:1fr 1fr}.asset-description-editor h4,.asset-description-hint,.asset-description-status {grid-column:1 / -1}}

      .asset-browser--list .asset-browser-preview {display:none}
    `}</style>
    {hasMore && <button type="button" disabled={busy} onClick={()=>{setBusy(true);load(page+1).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}}>Load more files</button>}
  </details>
}

function AssetDetails({asset,draft,onDraft,endpoint,disabled,onSaved}:{asset:Asset;draft?:DescriptionDraft;onDraft:(draft:DescriptionDraft|null)=>void;endpoint:string;disabled:boolean;onSaved:(name:string,alt:string,caption:string)=>void}) {
 const original={name:asset.title,alt:asset.alt_text??'',caption:asset.caption??''}
 const fields=draft??original
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const isImage=!!asset.mime_type?.startsWith('image/')
 function change(patch:Partial<DescriptionDraft>){const next={...fields,...patch};onDraft(next.name===original.name&&next.alt===original.alt&&next.caption===original.caption?null:next)}
 return <section className="asset-description-editor" aria-label="Asset details">
 <h4>Asset details {draft&&<span style={{fontSize:11,fontWeight:400,color:'var(--amber-label)'}}> · Unsaved</span>}</h4>
 <label style={{gridColumn:'1 / -1'}}>Asset name<input className="input" aria-label="Asset name" required maxLength={200} value={fields.name} disabled={busy||disabled} onChange={e=>change({name:e.target.value})} /></label>
 {isImage&&<><label>Alt text<textarea aria-label="Alt text" className="input" rows={3} maxLength={2000} value={fields.alt} disabled={busy||disabled} onChange={e=>change({alt:e.target.value})} /></label>
 <label>Caption <span className="asset-field-optional">(optional)</span><textarea aria-label="Caption" className="input" rows={3} maxLength={5000} value={fields.caption} disabled={busy||disabled} onChange={e=>change({caption:e.target.value})} /></label></>}
 <button type="button" className="btn btn-secondary btn-sm" disabled={busy||disabled||!draft||!fields.name.trim()} onClick={async()=>{
   setBusy(true);setMessage('')
   try{await requestJson(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:asset.id,display_name:fields.name,alt_text:fields.alt,caption:fields.caption})},'asset details save');onSaved(fields.name.trim(),fields.alt,fields.caption);setMessage('Details saved.')}
   catch(e){setMessage(e instanceof Error?e.message:'Save failed')}
   finally{setBusy(false)}
 }}>{busy?'Saving…':'Save details'}</button>
 {draft&&<button type="button" className="btn btn-ghost btn-sm" disabled={busy||disabled} onClick={()=>{onDraft(null);setMessage('')}}>Discard edits</button>}
 <p role="status" className="asset-description-status">{message}</p>
 </section>
}
