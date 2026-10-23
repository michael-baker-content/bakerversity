'use client'
import {useEditorState,type Editor} from '@tiptap/react'
import {collectFootnotes,footnoteBodyHtml} from '../../lib/footnotes.mjs'
import {renderNode} from '../renderer/renderNode'
import {HtmlSegment} from '../renderer/HtmlSegment'
export default function FootnotesPreview({editor}:{editor:Editor}){
 const notes=useEditorState({editor,selector:({editor})=>collectFootnotes(editor.getJSON())})
 if(!notes.length)return null
 return <section className="footnotes" aria-label="Footnotes" style={{padding:16}}><h3>Footnotes</h3><ol>{notes.map(note=><li key={note.id}><HtmlSegment html={footnoteBodyHtml(note.body,renderNode)}/>{editor.isEditable&&<button type="button" className="editor-tool" onClick={()=>editor.view.dispatch(editor.state.tr.setMeta('editFootnote',{id:note.id}))}>Edit footnote {note.number}</button>}<span style={{fontSize:12,color:'var(--text-2)',marginLeft:8}}>{note.references.length} {note.references.length===1?'reference':'references'}</span></li>)}</ol></section>
}
