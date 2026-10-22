'use client'
import {useState} from 'react'
import {textImageVerticalAlign} from '../../lib/textImage.mjs'
import type {Node as ProseMirrorNode} from '@tiptap/pm/model'
import './textImage.css'
import {NodeViewWrapper,NodeViewContent,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react'
import {closeHistory} from '@tiptap/pm/history'
import {TextImageExtension,textImageBoundarySelection} from './TextImageExtension'
function TextImageView({node,editor,getPos,selected,updateAttributes}:NodeViewProps){
 const [stacked,setStacked]=useState(false)
 const imageLeft=node.firstChild?.type.name==='image'
 const position=()=>getPos()
 function side(left:boolean){
  const pos=position();if(pos===undefined||left===imageLeft)return
  const children=[node.child(1),node.child(0)]
  editor.view.dispatch(closeHistory(editor.state.tr).replaceWith(pos,pos+node.nodeSize,node.type.create(node.attrs,children)))
 }
 function unwrap(){
  const pos=position();if(pos===undefined)return
  const blocks: ProseMirrorNode[]=[]
  for(let i=0;i<node.childCount;i++){const child=node.child(i);if(child.type.name==='textImageBody')child.forEach(block=>blocks.push(block));else blocks.push(child)}
  editor.chain().focus().command(({tr})=>{closeHistory(tr).replaceWith(pos,pos+node.nodeSize,blocks);return true}).run()
 }
 function moveOutside(direction:-1|1,event:React.MouseEvent){
  event.preventDefault();event.stopPropagation()
  const pos=position();if(pos===undefined)return
  const selection=textImageBoundarySelection(editor.state,pos,node.nodeSize,direction)
  if(selection){editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());editor.view.focus()}
 }
 return <NodeViewWrapper className="text-image-editor" data-selected={selected} data-stacked={stacked} data-text-vertical-align={textImageVerticalAlign(node.attrs.textVerticalAlign)}>
  <div contentEditable={false} aria-hidden="true" className="text-image-boundary text-image-boundary-before" onMouseDown={event=>moveOutside(-1,event)} />
  <div contentEditable={false} aria-hidden="true" className="text-image-boundary text-image-boundary-after" onMouseDown={event=>moveOutside(1,event)} />
  <div contentEditable={false} className="text-image-controls" onMouseDown={e=>e.preventDefault()}>
   <span data-drag-handle>Text and image</span>
   <button type="button" className="editor-tool" aria-pressed={imageLeft} onClick={()=>side(true)}>Image left</button>
   <button type="button" className="editor-tool" aria-pressed={!imageLeft} onClick={()=>side(false)}>Image right</button>
   <button type="button" className="editor-tool" onClick={()=>{const pos=position();if(pos!==undefined)editor.view.dispatch(editor.state.tr.setMeta('editComponentImage',pos+1+(imageLeft?0:node.firstChild!.nodeSize)))}}>Image settings</button>
   <label className="text-image-alignment">Text alignment <select className="editor-tool" aria-label="Text vertical alignment" value={textImageVerticalAlign(node.attrs.textVerticalAlign)} onMouseDown={event=>event.stopPropagation()} onChange={event=>updateAttributes({textVerticalAlign:event.target.value})}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
   <button type="button" className="editor-tool" aria-pressed={stacked} onClick={()=>setStacked(!stacked)}>Stacked preview</button>
   <button type="button" className="editor-tool" onClick={unwrap}>Convert to regular content</button>
   <button type="button" className="editor-tool" onClick={()=>{const pos=position();if(pos!==undefined)editor.chain().focus().setNodeSelection(pos).run()}}>Select component</button>
  </div>
  <NodeViewContent className="text-image-grid" />
 </NodeViewWrapper>
}
export const TextImageNode=TextImageExtension.extend({addNodeView(){return ReactNodeViewRenderer(TextImageView)}})
