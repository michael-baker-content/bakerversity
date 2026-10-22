'use client'
import {useEditorState,NodeViewWrapper,NodeViewContent,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react'
import {textImageBoundarySelection} from './TextImageExtension'
import {closeHistory} from '@tiptap/pm/history'
import {SlideshowExtension,SlideshowSlideExtension} from './SlideshowExtension'
import './slideshow.css'
function SlideshowView({node,editor,getPos,updateAttributes,deleteNode}:NodeViewProps){
 const boundary=(direction:-1|1,event:React.MouseEvent)=>{event.preventDefault();const at=getPos();if(at===undefined)return;const selection=textImageBoundarySelection(editor.state,at,node.nodeSize,direction);if(selection){editor.view.dispatch(editor.state.tr.setSelection(selection));editor.view.focus()}}
 return <NodeViewWrapper className="slideshow slideshow-editor">
 <div contentEditable={false} aria-hidden="true" className="text-image-boundary text-image-boundary-before" onMouseDown={event=>boundary(-1,event)}/>
 <div contentEditable={false} aria-hidden="true" className="text-image-boundary text-image-boundary-after" onMouseDown={event=>boundary(1,event)}/>
 <div contentEditable={false} className="slideshow-controls">
 <span data-drag-handle>Image slideshow</span>
 <label>Title <input aria-label="Slideshow title" value={node.attrs.title} onChange={e=>updateAttributes({title:e.target.value})}/></label>
 <button type="button" className="editor-tool" onClick={()=>editor.view.dispatch(editor.state.tr.setMeta('addSlideshowImage',node.attrs.id))}>Add image</button>
 <button type="button" className="editor-tool" onClick={deleteNode}>Remove slideshow</button>
 </div><NodeViewContent /></NodeViewWrapper>
}
function SlideView({node,editor,getPos}:NodeViewProps){
 const {index,count}=useEditorState({editor,selector:({editor})=>{const pos=getPos();const resolved=pos===undefined||pos>editor.state.doc.content.size?null:editor.state.doc.resolve(pos);return {index:resolved?.index()??0,count:resolved?.parent.childCount??1}}})
 function move(direction:number){
  const at=getPos();if(at===undefined)return
  const start=editor.state.doc.resolve(at);const parent=start.parent;const i=start.index();const next=i+direction
  if(next<0||next>=parent.childCount)return
  const slides=Array.from({length:parent.childCount},(_,j)=>parent.child(j));[slides[i],slides[next]]=[slides[next],slides[i]]
  const parentPos=start.before();editor.view.dispatch(closeHistory(editor.state.tr).replaceWith(parentPos,parentPos+parent.nodeSize,parent.type.create(parent.attrs,slides)))
 }
 function remove(){const at=getPos();if(at===undefined)return;const start=editor.state.doc.resolve(at);if(start.parent.childCount>1)editor.view.dispatch(editor.state.tr.delete(at,at+node.nodeSize))}
 return <NodeViewWrapper className="slideshow-slide">
 <div contentEditable={false} className="slideshow-controls" onMouseDown={e=>e.preventDefault()}>
 <span>Slide {index+1} of {count}</span>
 <button type="button" className="editor-tool" onClick={()=>{const at=getPos();if(at!==undefined)editor.view.dispatch(editor.state.tr.setMeta('editComponentImage',at+1))}}>Image settings</button>
 <button type="button" className="editor-tool" disabled={index===0} onClick={()=>move(-1)}>Move earlier</button>
 <button type="button" className="editor-tool" disabled={index===count-1} onClick={()=>move(1)}>Move later</button>
 <button type="button" className="editor-tool" disabled={count===1} onClick={remove}>Remove slide</button>
 </div><NodeViewContent /></NodeViewWrapper>
}
export const SlideshowNode=SlideshowExtension.extend({addNodeView(){return ReactNodeViewRenderer(SlideshowView)}})
export const SlideshowSlide=SlideshowSlideExtension.extend({addNodeView(){return ReactNodeViewRenderer(SlideView)}})
