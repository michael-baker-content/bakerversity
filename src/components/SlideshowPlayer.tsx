'use client'
import {useEffect,useRef,useState} from 'react'
import {HtmlSegment} from './renderer/HtmlSegment'
import {renderNode} from './renderer/renderNode'
import {imageDelivery} from '../lib/imageDelivery.mjs'
import './editor/slideshow.css'
type ContentNode=Record<string,unknown>
export function SlideshowPlayer({node}:{node:ContentNode}){
 const slides=(node.content??[]) as ContentNode[]
 const [active,setActive]=useState(0)
 const root=useRef<HTMLElement>(null)
 const title=String((node.attrs as Record<string,unknown>)?.title??'')
 useEffect(()=>{
  const image=(slides[active+1]?.content as ContentNode[]|undefined)?.[0]
  const src=(image?.attrs as Record<string,unknown>)?.src
  if(typeof src==='string'){const preload=new Image();const delivery=imageDelivery(src);if(delivery.srcSet){preload.sizes=delivery.sizes??'';preload.srcset=delivery.srcSet}preload.src=delivery.src}
 },[active,slides])
 useEffect(()=>{root.current?.querySelectorAll('[data-active="true"] img').forEach(image=>image.setAttribute('loading','eager'))},[active])
 if(!slides.length)return null
 return <section ref={root} className="slideshow slideshow-player" aria-roledescription="carousel" aria-label={title||'Image slideshow'} tabIndex={0} onKeyDown={event=>{
  if(event.target!==event.currentTarget)return
  if(event.key==='ArrowRight'){event.preventDefault();setActive(Math.min(slides.length-1,active+1))}
  if(event.key==='ArrowLeft'){event.preventDefault();setActive(Math.max(0,active-1))}
 }}>
 {title&&<h3>{title}</h3>}
 {slides.map((slide,index)=><div className="slideshow-slide" data-active={index===active} key={index} role="group" aria-roledescription="slide" aria-label={(index+1)+' of '+slides.length}><HtmlSegment html={((slide.content??[]) as ContentNode[]).map(child=>renderNode(child)).join('')}/></div>)}
 <div className="slideshow-navigation"><button type="button" className="editor-tool" disabled={active===0} onClick={()=>setActive(active-1)}>Previous</button><span aria-live="polite" aria-atomic="true">Slide {active+1} of {slides.length}</span><button type="button" className="editor-tool" disabled={active===slides.length-1} onClick={()=>setActive(active+1)}>Next</button></div>
 </section>
}
