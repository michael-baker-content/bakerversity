"use client"
import { useRef, useState, useEffect } from 'react'
import { imageDelivery } from '@/lib/imageDelivery.mjs'

export default function SiteImage(props: { src: string; alt: string; sizes: string; priority?: boolean; cover?: boolean }) {
  return <ImageContent key={props.src} {...props} />
}
function ImageContent({ src, alt, sizes, priority = false, cover = false }: { src: string; alt: string; sizes: string; priority?: boolean; cover?: boolean }) {
  const [state, setState] = useState('loading')
  const [original, setOriginal] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  const delivery = original ? { src } : imageDelivery(src, sizes)
  const failed = () => {
    if (!original && delivery.src !== src) setOriginal(true)
    else setState('error')
  }
  useEffect(() => {
    if (ref.current?.complete) {
      if (ref.current.naturalWidth) setState('loaded')
      else if (delivery.src !== src) setOriginal(true)
      else setState('error')
    }
  }, [])
  return <div className={`media-image${cover ? ' media-image-cover' : ''}`} data-state={state}>
    <img ref={ref} {...delivery} alt={alt} hidden={state === 'error'} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onLoad={() => setState('loaded')} onError={failed} />
    {state === 'error' && <div className="media-image-error"><span>Image could not be loaded.</span> {!cover && <button type="button" onClick={() => { setState('loading'); setOriginal(true); if (ref.current) ref.current.src = src }}>Retry image</button>}</div>}
  </div>
}
