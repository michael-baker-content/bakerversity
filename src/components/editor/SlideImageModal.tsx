'use client'
import type {JSONContent} from '@tiptap/core'
import SlideDescriptionEditor from './SlideDescriptionEditor'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {requestJson} from '../../lib/authoring/request'
import {imageMaxWidth} from '../../lib/imageWidth.mjs'
export interface SlideImageDraft {description?:JSONContent;src:string;alt:string;title:string;pos:number|null;assetId?:string;assetName?:string;creditName?:string|null;creditUrl?:string|null;width?:number;height?:number;maxWidth?:string;alignment?:'left'|'center'}
export default function SlideImageModal({initial,courseId,onSubmit,onClose,onChoose,onUnsplash}:{initial:SlideImageDraft;courseId?:string;onSubmit:(draft:SlideImageDraft,another:boolean)=>boolean;onClose:()=>void;onChoose:(draft:SlideImageDraft)=>void;onUnsplash:(draft:SlideImageDraft)=>void}){
 const [draft,setDraft]=useState(initial),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[defaults,setDefaults]=useState(false),[another,setAnother]=useState(false)
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),preview=useRef<string|null>(null)
 useEffect(()=>{dialog.current?.showModal();return ()=>{if(preview.current)URL.revokeObjectURL(preview.current)}},[])
 async function submit(){
  if(busy||!draft.alt.trim()||!draft.src)return
  setBusy(true);setError('')
  let saved=draft
  try{
   if(file){
    const body=new FormData();body.append('file',file)
    const result=await requestJson<{asset_id:string;url:string}>('/api/admin/assets?kind=image'+(courseId?'&course_id='+encodeURIComponent(courseId):''),{method:'POST',body},'slide image upload')
    if(!result.url||!result.asset_id)throw new Error('The upload did not return an image. Check the library before retrying.')
    saved={...draft,src:result.url,assetId:result.asset_id};setDraft(saved);setFile(null)
   }
   if(defaults&&saved.assetId&&courseId){
    await requestJson('/api/admin/assets?course_id='+encodeURIComponent(courseId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:saved.assetId,display_name:saved.assetName,alt_text:saved.alt.trim(),caption:saved.title})},'slide image details save')
   }
   if(!onSubmit({...saved,alt:saved.alt.trim()},another))setError('Unable to update the slideshow. Your settings are still here.')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save the slide.')}
  finally{setBusy(false)}
 }
 return createPortal(<dialog ref={dialog} aria-labelledby="slide-image-title" onCancel={event=>{event.preventDefault();if(!busy)onClose()}} style={{width:600,maxWidth:'calc(100vw - 32px)',maxHeight:'90dvh',overflowY:'auto',background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:12,padding:24}}>
 <h3 id="slide-image-title">{initial.pos===null?'Add slideshow image':'Edit slideshow image'}</h3>
 <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}>
 {draft.src&&<img src={draft.src} alt="" style={{display:'block',margin:'0 auto 16px',maxWidth:'100%',maxHeight:220,objectFit:'contain'}}/>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
 <button type="button" className="btn btn-secondary btn-sm" onClick={()=>input.current?.click()}>Upload image</button>
 <button type="button" className="btn btn-secondary btn-sm" disabled={!!file} onClick={()=>onChoose(draft)}>Choose course image</button>
 <button type="button" className="btn btn-ghost btn-sm" disabled={!!file} onClick={()=>onUnsplash(draft)}>Search Unsplash</button>
 </div>
 <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e=>{
  const selected=e.target.files?.[0];e.target.value='';if(!selected)return
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(selected.type)||selected.size>50*1024*1024){setError('Choose a JPEG, PNG, WebP or GIF image up to 50 MB.');return}
  if(preview.current)URL.revokeObjectURL(preview.current);preview.current=URL.createObjectURL(selected)
  setFile(selected);setDefaults(true);setError('');setDraft(current=>({...current,src:preview.current!,assetId:undefined,assetName:selected.name,creditName:null,creditUrl:null,width:undefined,height:undefined}))
 }}/>
 {draft.creditName&&<p>Photo by {draft.creditName} on Unsplash</p>}
 {(draft.assetId||file)&&<label style={{display:'block',marginBottom:12}}>Asset name<input aria-label="Asset name" className="input" maxLength={200} value={draft.assetName??''} onChange={e=>{setDraft({...draft,assetName:e.target.value});setDefaults(true)}}/></label>}
 <label style={{display:'block',marginBottom:12}}>Alt text (required)<textarea aria-label="Alt text" className="input" required maxLength={2000} rows={3} value={draft.alt} onChange={e=>setDraft({...draft,alt:e.target.value})}/></label>
 <label style={{display:'block',marginBottom:12}}>Caption (optional)<textarea aria-label="Caption" className="input" maxLength={5000} rows={2} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
 <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Description (optional)</div>
 <SlideDescriptionEditor content={initial.description??{type:'doc',content:[{type:'paragraph'}]}} disabled={busy} onChange={description=>setDraft(current=>({...current,description}))}/>
 <label style={{display:'block',marginBottom:12}}>Maximum width (px)<input className="input" type="number" min={1} max={10000} placeholder="No limit" value={draft.maxWidth??''} onChange={e=>setDraft({...draft,maxWidth:e.target.value})}/></label>
 {courseId&&(draft.assetId||file)&&<label style={{display:'block',marginBottom:12}}><input type="checkbox" checked={defaults} onChange={e=>setDefaults(e.target.checked)}/> Save name, alt text and caption as course library defaults</label>}
 {file&&<p style={{fontSize:12}}>This image will be added to the course asset library when you add the slide.</p>}
 {initial.pos===null&&courseId&&<label style={{display:'block',marginBottom:16}}><input type="checkbox" checked={another} onChange={e=>setAnother(e.target.checked)}/> Choose another image after adding</label>}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:8}}><button type="button" className="btn btn-primary btn-sm" disabled={!draft.src||!draft.alt.trim()||(defaults&&!!(draft.assetId||file)&&!draft.assetName?.trim())||(!!draft.maxWidth&&imageMaxWidth(draft.maxWidth)===null)} onClick={()=>void submit()}>{busy?'Saving…':initial.pos===null?'Add slide':'Update slide'}</button><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button></div>
 </fieldset>
 </dialog>,document.body)
}
