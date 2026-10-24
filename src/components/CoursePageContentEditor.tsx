'use client'

import type {RecoveryOptions} from '@/lib/authoring/recovery'
import type {ImportMetadata} from '@/lib/authoring/importMetadata'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import MarkdownImport from './MarkdownImport'
import EditorDownload from '@/components/EditorDownload'
import { requestJson } from '@/lib/authoring/request'
import type { EditorPack } from './TipTapEditor'
import type { MafsGraphAttrs } from './MafsGraph'

const TipTapEditor = dynamic(() => import('./TipTapEditor'), { ssr:false })
const LatexModal = dynamic(() => import('./LatexModal'), { ssr:false })
const MafsGraphEditor = dynamic(() => import('./MafsGraphEditor'), { ssr:false })

export default function CoursePageContentEditor({courseId,content,onChange,exportMetadata,onImportMetadata,metadataFields,recovery,resetKey}:{
  resetKey?:number
  recovery?:RecoveryOptions
  onImportMetadata?:(values:ImportMetadata)=>void
  metadataFields?:(keyof ImportMetadata)[]
  exportMetadata?:Record<string,string|number|boolean|null|undefined>
  courseId:string|null
  content:Record<string,unknown>
  onChange:(content:Record<string,unknown>)=>void
}) {
  const [config,setConfig]=useState<{courseId:string;packs:EditorPack[]}|null>(null)
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)
  const [showMath,setShowMath]=useState(false)
  const [showGraph,setShowGraph]=useState(false)
  const insert=useRef<((doc:Record<string,unknown>)=>void)|null>(null)
  const exportContent=useRef<((format:'html'|'markdown'|'txt')=>void)|null>(null)
  const insertMath=useRef<((latex:string,display:boolean)=>void)|null>(null)
  const insertGraph=useRef<((attrs:MafsGraphAttrs)=>void)|null>(null)
  useEffect(()=>{
    let active=true
    setConfig(null);setError('')
    if(!courseId)return
    requestJson<{editor_tools?:EditorPack[]|null}>(`/api/admin/courses/${courseId}`)
      .then(course=>{if(active)setConfig({courseId,packs:course.editor_tools??[]})})
      .catch(error=>{if(active)setError(error instanceof Error?error.message:'Unable to load editor tools.')})
    return ()=>{active=false}
  },[courseId,retry])
  if(error)return <div role="alert">Unable to load editor tools. {error} <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setRetry(n=>n+1)}>Retry editor tools</button></div>
  if(!config||config.courseId!==courseId)return <p role="status">Loading editor tools…</p>
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:8}}>
      <span style={{fontSize:13,fontWeight:600}}>Content</span>
      <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:6}}>
        <MarkdownImport recovery={recovery} metadataFields={metadataFields} onMetadata={onImportMetadata} hasExistingContent={Object.keys(content).length>0} onInsert={doc=>insert.current?.(doc)} />
        <EditorDownload recovery={recovery} onDownload={format => exportContent.current?.(format)} />
      </div>
    </div>
    <TipTapEditor key={resetKey} exportMetadata={exportMetadata} courseId={courseId??undefined} packs={config.packs} content={Object.keys(content).length?content:undefined} onChange={onChange}
      onEditorReady={fn=>{insert.current=fn}} onExportReady={fn=>{exportContent.current=fn}}
      onLatexButtonClick={()=>setShowMath(true)} onInsertLatex={fn=>{insertMath.current=fn}}
      onGraphButtonClick={()=>setShowGraph(true)} onInsertGraph={fn=>{insertGraph.current=fn}} />
    {showMath && config.packs.includes('math') && <LatexModal showDisplayToggle onInsert={(latex,display)=>insertMath.current?.(latex,display)} onClose={()=>setShowMath(false)} />}
    {showGraph && config.packs.includes('graph') && <MafsGraphEditor onSave={attrs=>{insertGraph.current?.(attrs);setShowGraph(false)}} onClose={()=>setShowGraph(false)} />}
  </div>
}
