'use client'

import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type Format = 'html' | 'markdown' | 'txt'
export default function EditorDownload({ onDownload }: { onDownload: (format: Format) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  return <>
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => dialog.current?.showModal()}>Download</button>
    {typeof document !== 'undefined' && createPortal(<dialog ref={dialog} aria-labelledby={titleId}
      style={{width:'min(420px, calc(100vw - 32px))',maxHeight:'80dvh',overflow:'auto',padding:24,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text)'}}
      onClick={event => { if (event.target === event.currentTarget) { const bounds=event.currentTarget.getBoundingClientRect(); if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) dialog.current?.close() } }}>
      <h2 id={titleId} style={{margin:'0 0 16px',fontSize:20}}>Download content</h2>
      <div style={{display:'grid',gap:8}}>
        {([{format:'html',label:'HTML (.html)'},{format:'markdown',label:'Markdown (.md)'},{format:'txt',label:'Plain text (.txt)'}] as const).map(option =>
          <button key={option.format} type="button" className="btn btn-secondary" onClick={() => { onDownload(option.format); dialog.current?.close() }}>{option.label}</button>)}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:16}} onClick={() => dialog.current?.close()}>Cancel</button>
    </dialog>,document.body)}
  </>
}
