import {slideshowPlainText} from '../../lib/slideshow.mjs'
import {Plugin} from '@tiptap/pm/state'
import { Node } from '@tiptap/core'
export const SlideshowExtension=Node.create({
 name:'slideshow',group:'block',content:'slideshowSlide+',defining:true,isolating:true,draggable:true,
 renderText({node}){return slideshowPlainText(node.toJSON())},
 addProseMirrorPlugins(){return [new Plugin({appendTransaction:(transactions,_old,state)=>{
  if(!transactions.some(tr=>tr.docChanged))return null
  const seen=new Set<string>();const tr=state.tr
  state.doc.forEach((node,pos)=>{if(node.type.name==='slideshow'){const id=node.attrs.id;if(!id||seen.has(id)){const next=crypto.randomUUID();tr.setNodeMarkup(pos,undefined,{...node.attrs,id:next});seen.add(next)}else seen.add(id)}})
  return tr.docChanged?tr:null
 }})]},
 addAttributes(){return {id:{default:null},title:{default:''}}},
 parseHTML(){return [{tag:'section[data-slideshow]',contentElement:'div',getAttrs:element=>({title:element.getAttribute('data-title')??'',id:element.getAttribute('data-id')})}]},
 renderHTML({node}){return ['section',{'data-slideshow':'','data-id':node.attrs.id,'data-title':node.attrs.title,class:'slideshow'},...(node.attrs.title?[['h3',{},node.attrs.title]]:[]),['div',{},0]] as import('@tiptap/pm/model').DOMOutputSpec},
})
export const SlideshowSlideExtension=Node.create({
 name:'slideshowSlide',content:'image slideshowDescription',defining:true,isolating:true,
 parseHTML(){return [{tag:'section[data-slideshow-slide]'}]},
 renderHTML(){return ['section',{'data-slideshow-slide':'',class:'slideshow-slide'},0]},
})
export const SlideshowDescription=Node.create({
 name:'slideshowDescription',content:'(paragraph | heading | bulletList | orderedList | blockMath)+',defining:true,isolating:true,
 parseHTML(){return [{tag:'div[data-slide-description]'}]},
 renderHTML(){return ['div',{'data-slide-description':'',class:'slide-description'},0]},
})
