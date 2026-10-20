'use client'
import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/authoring/request'
import { resourcePurposes, resourceSelection, type ResourcePurpose, type ResourceSelection } from '@/lib/authoring/resources'

export type Asset = { id: string; title: string; original_filename?: string | null; url: string; alt_text: string | null; caption?: string | null; mime_type?: string | null; byte_size: number; item_assets: { item_id: string }[] }
interface Props { onPickImage?: (asset:Asset)=>void; initiallyOpen?: boolean; courseId?: string; value?: ResourceSelection[]; onChange?: (value: ResourceSelection[]) => void; disabled?: boolean }
export default function AssetLibrary({ onPickImage, initiallyOpen = false, courseId, value = [], onChange, disabled = false }: Props) {
  const [view,setView]=useState<'tiles'|'list'>('tiles')
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
  return <details open={initiallyOpen || undefined} style={{ margin: '16px 0', padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}><summary>Course asset library</summary>
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
    <div role="group" aria-label="Library view" style={{display:'flex',gap:6,margin:'12px 0'}}>
      <button type="button" className={'btn btn-sm '+(view==='tiles'?'btn-secondary':'btn-ghost')} aria-pressed={view==='tiles'} onClick={()=>setView('tiles')}>Tiles</button>
      <button type="button" className={'btn btn-sm '+(view==='list'?'btn-secondary':'btn-ghost')} aria-pressed={view==='list'} onClick={()=>setView('list')}>Text list</button>
    </div>
    <div className={'asset-browser asset-browser--'+view}>
    {assets.map(a => {
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
            {courseId && isImage && <ImageDefaults asset={a} endpoint={endpoint} disabled={disabled||busy} onSaved={(alt,caption)=>setAssets(rows=>rows.map(row=>row.id===a.id?{...row,alt_text:alt,caption}:row))} />}
            <div className="asset-file-actions">
        {onPickImage && isImage && <button type="button" className="btn btn-primary btn-sm asset-browser-use" disabled={disabled||busy} onClick={()=>onPickImage(a)}>Use image</button>}
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

function ImageDefaults({asset,endpoint,disabled,onSaved}:{asset:Asset;endpoint:string;disabled:boolean;onSaved:(alt:string,caption:string)=>void}) {
 const [alt,setAlt]=useState(asset.alt_text??''),[caption,setCaption]=useState(asset.caption??'')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 return <section className="asset-description-editor" aria-label="Default image descriptions">
 <h4>Image descriptions</h4>
 <label>Alt text<textarea className="input" rows={3} maxLength={2000} value={alt} disabled={busy||disabled} onChange={e=>setAlt(e.target.value)} /></label>
 <label>Caption <span className="asset-field-optional">(optional)</span><textarea className="input" rows={3} maxLength={5000} value={caption} disabled={busy||disabled} onChange={e=>setCaption(e.target.value)} /></label>
 <button type="button" className="btn btn-secondary btn-sm" disabled={busy||disabled || (alt===(asset.alt_text??'') && caption===(asset.caption??''))} onClick={async()=>{setBusy(true);setMessage('');try{await requestJson(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:asset.id,alt_text:alt,caption})},'image defaults save');onSaved(alt,caption);setMessage('Defaults saved.')}catch(e){setMessage(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}}>{busy?'Saving…':'Save defaults'}</button><p role="status" className="asset-description-status">{message}</p>
 </section>
}
