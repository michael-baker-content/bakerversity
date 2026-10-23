'use client'
import {NodeViewWrapper,ReactNodeViewRenderer,useEditorState,type NodeViewProps} from '@tiptap/react'
import {FootnoteExtension} from './FootnoteExtension'
import {collectFootnotes,footnoteText} from '../../lib/footnotes.mjs'
import './footnotes.css'
function FootnoteView({node,editor,getPos}:NodeViewProps){
 const number=useEditorState({editor,selector:({editor})=>collectFootnotes(editor.getJSON()).find(note=>note.id===node.attrs.id)?.number??'?'})
 return <NodeViewWrapper as="sup" className="footnote-reference" contentEditable={false}><button type="button" aria-label={'Edit footnote '+number} title={footnoteText(node.attrs.body)} onMouseDown={event=>event.preventDefault()} onClick={()=>editor.view.dispatch(editor.state.tr.setMeta('editFootnote',{id:node.attrs.id,pos:getPos()}))}>{number}</button></NodeViewWrapper>
}
export const FootnoteNode=FootnoteExtension.extend({addNodeView(){return ReactNodeViewRenderer(FootnoteView)}})
