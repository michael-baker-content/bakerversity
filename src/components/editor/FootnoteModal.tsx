'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import type {Editor,JSONContent} from '@tiptap/react'
import {closeHistory} from '@tiptap/pm/history'
import {collectFootnotes,footnoteText,footnoteError} from '../../lib/footnotes.mjs'
import SlideDescriptionEditor from './SlideDescriptionEditor'
export default function FootnoteModal({editor,target,onClose}:{editor:Editor;target:{id?:string;pos?:number};onClose:()=>void}){
 const notes=collectFootnotes(editor.getJSON())
 const existing=notes.find(note=>note.id===target.id)
 const [mode,setMode]=useState('new'),[selected,setSelected]=useState(notes[0]?.id??'')
 const [body,setBody]=useState<JSONContent>(existing?.body??{type:'doc',content:[{type:'paragraph'}]})
 const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 function save(){
  if(!existing&&mode==='reuse'){
   const note=collectFootnotes(editor.getJSON()).find(note=>note.id===selected)
   if(!note){setError('Choose an existing footnote.');return}
   if(editor.chain().focus().insertContentAt(editor.state.selection.to,{type:'footnote',attrs:{id:note.id,body:note.body}}).run())onClose()
   return
  }
  const id=existing?.id??crypto.randomUUID()
  const message=footnoteError({type:'doc',content:[{type:'footnote',attrs:{id,body}}]})
  if(message){setError(message);return}
  if(existing){
   const tr=closeHistory(editor.state.tr)
   editor.state.doc.descendants((node,pos)=>{if(node.type.name==='footnote'&&node.attrs.id===id)tr.setNodeMarkup(pos,undefined,{...node.attrs,body})})
   editor.view.dispatch(tr);onClose()
  }else if(editor.chain().focus().insertContentAt(editor.state.selection.to,{type:'footnote',attrs:{id,body}}).run())onClose()
 }
 return createPortal(<dialog ref={dialog} aria-label={existing?'Edit footnote':'Insert footnote'} onCancel={event=>{event.preventDefault();onClose()}} style={{width:580,maxWidth:'calc(100vw - 32px)',maxHeight:'90dvh',overflowY:'auto',padding:24,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text)'}}>
 <h3>{existing?'Edit footnote '+existing.number:'Insert footnote'}</h3>
 {!existing&&notes.length>0&&<label>Footnote<select className="input" value={mode} onChange={event=>setMode(event.target.value)}><option value="new">Create new footnote</option><option value="reuse">Reuse existing footnote</option></select></label>}
 {!existing&&mode==='reuse'?<label>Existing footnote<select className="input" value={selected} onChange={event=>setSelected(event.target.value)}>{notes.map(note=><option key={note.id} value={note.id}>{note.number}. {footnoteText(note.body).slice(0,100)}</option>)}</select></label>:<>
 {existing&&existing.references.length>1&&<p>This updates all {existing.references.length} references on this page.</p>}
 <SlideDescriptionEditor content={body} onChange={setBody} disabled={false} basicOnly label="Footnote text"/>
 </>}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" className="btn btn-primary btn-sm" disabled={(existing||mode==='new')&&!footnoteText(body).trim()} onClick={save}>{existing?'Save footnote':'Insert reference'}</button>
 {target.pos!==undefined&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>{const node=editor.state.doc.nodeAt(target.pos!);if(node?.type.name==='footnote'&&node.attrs.id===target.id)editor.view.dispatch(editor.state.tr.delete(target.pos!,target.pos!+node.nodeSize));onClose()}}>Remove this reference</button>}
 <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button></div>
 </dialog>,document.body)
}
