'use client'
import { editorLinkOptions, editorLink, isEditorLink } from '../../lib/editorLinks.mjs'
import {useState,useId} from 'react'
import {EditorContent,useEditor,useEditorState,type JSONContent} from '@tiptap/react'
import {getMarkRange} from '@tiptap/core'
import {TextSelection} from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import {TextLanguage} from './TextLanguage'
import {InlineMath,BlockMath} from './nodes'
export default function SlideDescriptionEditor({content,onChange,disabled,basicOnly=false,label='Slide description'}:{content:JSONContent;onChange:(value:JSONContent)=>void;disabled:boolean;basicOnly?:boolean;label?:string}){
 const linkPanelId=useId()
 const [linkOpen,setLinkOpen]=useState(false),[href,setHref]=useState('')
 const editor=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({heading:basicOnly?false:undefined,codeBlock:false,blockquote:false,horizontalRule:false,link:editorLinkOptions,trailingNode:false}),...(basicOnly?[]:[Highlight,TextLanguage,InlineMath,BlockMath])],content,onUpdate:({editor})=>onChange(editor.getJSON()),editorProps:{handleDoubleClick:(view,_pos,event)=>{
  if(disabled)return false
  const anchor=(event.target as HTMLElement).closest('a')
  if(!anchor||!view.dom.contains(anchor))return false
  const pos=view.posAtDOM(anchor,0)
  const range=getMarkRange(view.state.doc.resolve(pos),view.state.schema.marks.link)
  if(!range)return false
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,range.from,range.to)))
  setHref(anchor.getAttribute('href')??'');setLinkOpen(true)
  return true
 },attributes:{'aria-label':label,role:'textbox','aria-multiline':'true',style:'min-height:100px;padding:12px;outline:none'}}})
 // Cursor-only mark changes update stored marks without changing document content.
 // Subscribe to transactions so the toolbar reflects those changes immediately.
 const formatting=useEditorState({editor,selector:({editor})=>({
  bold:editor?.isActive('bold')??false,
  italic:editor?.isActive('italic')??false,
  bulletList:editor?.isActive('bulletList')??false,
  orderedList:editor?.isActive('orderedList')??false,
 })})
 if(!editor)return null
 const validLink=isEditorLink(href)
 function applyLink(){
  if(!editor||disabled||!validLink)return
  if(editor.chain().focus().extendMarkRange('link').setLink(editorLink(href)).run())setLinkOpen(false)
 }
 function closeLink(){setLinkOpen(false);editor?.commands.focus()}
 return <div className="slide-description-editor" style={{display:'flex',flexDirection:'column',border:'1px solid var(--border)',borderRadius:8,marginBottom:16}}>
 {/* DOM order follows the writing workflow; CSS keeps the toolbar above the text. */}
 <EditorContent editor={editor} inert={disabled} style={{order:2}}/>
 <div role="group" aria-label="Description formatting" style={{order:0,display:'flex',gap:6,flexWrap:'wrap',padding:8,borderBottom:'1px solid var(--border)'}} onMouseDown={e=>e.preventDefault()}>
 <button type="button" className="editor-tool" disabled={disabled} aria-pressed={formatting?.bold??false} onClick={()=>editor.chain().focus().toggleBold().run()}>Bold</button>
 <button type="button" className="editor-tool" disabled={disabled} aria-pressed={formatting?.italic??false} onClick={()=>editor.chain().focus().toggleItalic().run()}>Italic</button>
 <button type="button" className="editor-tool" disabled={disabled} aria-pressed={formatting?.bulletList??false} onClick={()=>editor.chain().focus().toggleBulletList().run()}>Bullets</button>
 <button type="button" className="editor-tool" disabled={disabled} aria-pressed={formatting?.orderedList??false} onClick={()=>editor.chain().focus().toggleOrderedList().run()}>Numbered list</button>
 <button type="button" className="editor-tool" disabled={disabled} aria-pressed={linkOpen} aria-expanded={linkOpen} aria-controls={linkPanelId} onClick={()=>{setHref(editor.getAttributes('link').href??'');setLinkOpen(!linkOpen)}}>Link</button>
 </div>
 {linkOpen&&<div id={linkPanelId} role="group" aria-label="Description link settings" style={{order:1,padding:8}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeLink()}}}>
 <label>Link URL<input className="input" autoFocus value={href} onChange={e=>setHref(e.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();applyLink()}}}/></label>
 <div style={{display:'flex',gap:6,marginTop:8}} onMouseDown={event=>event.preventDefault()}>
 <button type="button" className="editor-tool" disabled={disabled||!validLink} onClick={applyLink}>Apply link</button>
 <button type="button" className="editor-tool" disabled={disabled} onClick={()=>{editor.chain().focus().extendMarkRange('link').unsetLink().run();setLinkOpen(false)}}>Remove link</button>
 <button type="button" className="editor-tool" onClick={closeLink}>Cancel link</button>
 </div></div>}
 <style>{`.slide-description-editor .tiptap a {color:var(--indigo);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}`}</style>
 </div>
}
