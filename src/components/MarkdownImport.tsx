'use client'

import type {ImportMetadata} from '@/lib/authoring/importMetadata'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { RecoveryOptions } from '@/lib/authoring/recovery'

interface MarkdownImportProps {
  recovery?: RecoveryOptions
  recoveryOnly?: boolean
  metadataFields?: (keyof ImportMetadata)[]
  onMetadata?: (metadata:ImportMetadata)=>void
  onInsert?: (content: Record<string, unknown>) => void
  hasExistingContent?: boolean
}

export default function MarkdownImport({ onInsert, hasExistingContent,metadataFields=[],onMetadata,recovery,recoveryOnly=false }: MarkdownImportProps) {
  const recoveryInputRef=useRef<HTMLInputElement>(null)
  const [restored,setRestored]=useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary,setSummary]=useState<string[]>([])
  const [skippedByDesign,setSkippedByDesign]=useState(false)
  const [imported,setImported]=useState(false)
  const infoDialog=useRef<HTMLDialogElement>(null)
  const infoTitle=useId()
  const mounted=useRef(true)
  const currentRecovery=useRef(recovery)
  currentRecovery.current=recovery
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])


  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('');setSummary([]);setImported(false);setRestored(false);setSkippedByDesign(false);infoDialog.current?.close()
    setLoading(true)

    try {
      // If editor already has content, confirm before replacing
      if (hasExistingContent) {
        const ok = confirm(
          'This will insert the markdown content at the end of the existing lesson. Continue?'
        )
        if (!ok) { setLoading(false); e.target.value = ''; return }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('metadata_fields',metadataFields.join(','))

      const res = await fetch('/api/admin/parse-markdown', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse file')
        return
      }

      onInsert?.(data.content)
      onMetadata?.(data.metadata??{})
      setImported(true)
      setSkippedByDesign(data.skippedByDesign===true)
      setSummary(Array.isArray(data.warnings)?data.warnings:[])
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  async function handleRecovery(event: React.ChangeEvent<HTMLInputElement>) {
    const input=event.currentTarget, file=input.files?.[0]
    input.value=''
    if(!file||!recovery||recovery.disabled)return
    setError('');setImported(false);setRestored(false);setSummary([]);setSkippedByDesign(false)
    try {
      if(file.size>5_000_000)throw new Error('Recovery files must be smaller than 5 MB.')
      const text=await file.text()
      if(!mounted.current||currentRecovery.current?.disabled)return
      const active=currentRecovery.current
      if(!active)return
      const fields=active.parse(text)
      if(!confirm('Restore this recovery copy? It will replace the matching fields and content in this editor. Download a recovery copy of your current edits first if you want to keep them. Nothing will be saved or published automatically.'))return
      active.restore(fields)
      setRestored(true)
    }catch(error){setError(error instanceof Error?error.message:'Unable to restore this file.')}
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8,flexWrap:'wrap' }}>
      <details style={{position:'relative'}}>
        <summary className="btn btn-ghost btn-sm" style={{cursor:'pointer'}}>Import from file</summary>
        <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:50,width:'min(260px, calc(100vw - 32px))',padding:12,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--text)',boxShadow:'0 8px 24px #0002'}}>
          {!recoveryOnly&&<><p style={{fontSize:12,margin:'0 0 10px'}}>Markdown (.md, .markdown), MDX (.mdx), or text (.txt).</p>
          <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={event => { fileInputRef.current?.click(); event.currentTarget.closest('details')?.removeAttribute('open') }}>{loading ? 'Parsing…' : 'Choose file'}</button></>}
          {recovery&&<button type="button" className="btn btn-ghost btn-sm" disabled={recovery.disabled} style={{marginTop:8}} onClick={event=>{recoveryInputRef.current?.click();event.currentTarget.closest('details')?.removeAttribute('open')}}>Restore recovery copy (.json)</button>}
        </div>
      </details>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.mdx,.txt,.markdown"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <input ref={recoveryInputRef} type="file" accept=".json,application/json" hidden onChange={handleRecovery} />
      {restored&&<span role="status" className="markdown-import-status">Restored · Not saved</span>}
      {imported&&<div className="markdown-import-status">
        <span role="status">Imported · Not saved{summary.length>0?' · Some fields not applied':''}</span>
        {(skippedByDesign||summary.length>0)&&<button type="button" className="markdown-import-info"
          aria-label="Import details" aria-haspopup="dialog" title="Import details"
          onClick={()=>infoDialog.current?.showModal()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>}
      </div>}
      {typeof document!=='undefined'&&createPortal(<dialog ref={infoDialog} aria-labelledby={infoTitle}
        style={{width:'min(480px, calc(100vw - 32px))',maxHeight:'80dvh',overflow:'auto',padding:24,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text)',overflowWrap:'anywhere'}}>
        <h2 id={infoTitle} style={{marginTop:0,fontSize:20}}>Import details</h2>
        {skippedByDesign&&<section>
          <h3 style={{fontSize:16}}>Settings kept unchanged</h3>
          <p>Exports include information about their source and course settings for reference. Importing leaves the destination’s identity, organization, and assessment settings unchanged. No action is needed.</p>
        </section>}
        {summary.length>0&&<section>
          <h3 style={{fontSize:16}}>Metadata not applied</h3>
          <p>These fields are unavailable on this editing page or contain values it cannot accept. You can review them below; supported content has already been imported.</p>
          <ul>{summary.map((message,index)=><li key={index}>{message}</li>)}</ul>
        </section>}
        <p>Review your imported content, then save when ready.</p>
        <button type="button" className="btn btn-secondary" onClick={()=>infoDialog.current?.close()}>Close</button>
      </dialog>,document.body)}
      {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
