import { documentError } from '../documentValidation.mjs'
import { resourceSelection } from './resources'

export interface RecoveryOptions {
  download: () => void
  parse: (text: string) => Record<string, unknown>
  restore: (fields: Record<string, unknown>) => void
  disabled: boolean
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const fail = (message: string): never => { throw new Error(message + ' Nothing was restored.') }
const enums: Record<string, string[]> = {
  activity_type:['explanation','tutorial','lab','reference','reflection','assessment'],
  placement:['introduction','body','conclusion'],
  page_type:['overview','introduction','syllabus','requirements','resources','conclusion','custom'],
  assessment_type:['quiz','exam','practice'],
  question_type:['multiple_choice','true_false','short_answer','text_response'],
}
function validateDocument(value: unknown) {
  if (!object(value)) fail('Invalid editor document.')
  if (!Object.keys(value as object).length) return
  let count=0
  function visit(node: unknown, depth=0) {
    if (depth>60 || ++count>50000 || !object(node) || typeof node.type!=='string') fail('Invalid editor document.')
    const n=node as Record<string,unknown>
    const nodes=['doc','paragraph','text','heading','bulletList','orderedList','listItem','blockquote','hardBreak','horizontalRule','image','table','tableRow','tableCell','tableHeader','codeBlock','inlineMath','blockMath','mafsGraph','terminalBlock','practiceQuiz','directoryTree','footnote','callout','slideshow','slideshowSlide','slideshowDescription','textImage','textImageBody']
    if(!nodes.includes(String(n.type)))fail('This document contains an unsupported element.')
    if(Array.isArray(n.marks)&&n.marks.some(mark=>!['bold','italic','strike','code','link','highlight','textLanguage'].includes(mark?.type)))fail('This document contains unsupported formatting.')

    const inline=['text','hardBreak','inlineMath','footnote']
    const blocks=['paragraph','heading','bulletList','orderedList','blockquote','horizontalRule','image','table','codeBlock','blockMath','mafsGraph','terminalBlock','practiceQuiz','directoryTree','callout','slideshow','textImage']
    const children:Record<string,string[]>={doc:blocks,paragraph:inline,heading:inline,bulletList:['listItem'],orderedList:['listItem'],listItem:blocks,blockquote:blocks,callout:blocks,table:['tableRow'],tableRow:['tableCell','tableHeader'],tableCell:blocks,tableHeader:blocks,codeBlock:['text']}
    const allowed=children[String(n.type)]
    if(allowed&&Array.isArray(n.content)&&n.content.some(child=>!object(child)||!allowed.includes(String(child.type))))fail('Invalid document structure.')
    if(n.type==='text'&&(typeof n.text!=='string'||!n.text.length))fail('Invalid document text.')
    if(n.text!==undefined && typeof n.text!=='string')fail('Invalid document text.')
    if(n.content!==undefined) {
      if(!Array.isArray(n.content))fail('Invalid document content.')
      ;(n.content as unknown[]).forEach(child=>visit(child,depth+1))
    }
    if(n.attrs!==undefined&&!object(n.attrs))fail('Invalid document attributes.')
    if(n.marks!==undefined&&(!Array.isArray(n.marks)||n.marks.some(mark=>!object(mark)||typeof mark.type!=='string')))fail('Invalid formatting.')
  }
  if((value as Record<string,unknown>).type!=='doc')fail('Expected an editor document.')
  visit(value)
  const error=documentError(value)
  if(error)fail(error)
}
export function parseRecovery(text: string, kind: string, template: Record<string,unknown>, courseId?: string|null) {
  if(text.length>5_000_000)fail('Recovery files must be smaller than 5 MB.')
  let file: Record<string,unknown>
  try {
    file=JSON.parse(text, (key,value)=>{
      if(['__proto__','constructor','prototype'].includes(key))throw new Error()
      return value
    })
  } catch { return fail('This is not a valid recovery file.') }
  if(!object(file)||![1,2].includes(file.formatVersion as number)||!object(file.fields))fail('Unsupported recovery format or version.')
  const source=file.fields as Record<string,unknown>
  const legacyNew=file.format==='bakerversity-new-item-recovery'
  const inferred='assessment_type' in source?'assessment':'page_type' in source?'page':'content' in source?'lesson':''
  if(file.format!==('bakerversity-'+kind+'-recovery')&&!(legacyNew&&inferred===kind))fail('This recovery file belongs to a different kind of editor.')
  if(file.courseId&&courseId&&file.courseId!==courseId)fail('Open this recovery file in its original course.')
  // Check nested attributes before any state is changed.
  function safe(value:unknown,depth=0){
    if(depth>100)fail('Recovery data is too deeply nested.')
    if(Array.isArray(value)){value.forEach(v=>safe(v,depth+1));return}
    if(!object(value))return
    for(const [key,v] of Object.entries(value)){
      if(['href','src','slidesUrl'].includes(key)&&typeof v==='string'&&v&&/^[\s\u0000-\u0020]*(?:javascript|vbscript|data):/i.test(v))fail('The recovery file contains an unsafe URL.')
      safe(v,depth+1)
    }
  }
  safe(source)
  const fields: Record<string,unknown>={}
  // Read only fields this editing screen can restore. Never copy identity,
  // ownership, module assignment, save actions, publication or revision state.
  const excluded=['lessonSlug','moduleId','module_id','slug','id','version','action']
  for(const [key,current] of Object.entries(template)){
    if(excluded.includes(key)||!(key in source))continue
    const value=source[key]
    if(['content','intro_content','explanation_content'].includes(key)){validateDocument(value);fields[key]=value;continue}
    if(key==='resources'){fields[key]=resourceSelection(value);continue}
    if(key==='metadata'){
      if(!object(value))fail('Invalid learning settings.')
      fields[key]=parseRecovery(JSON.stringify({format:('bakerversity-'+kind+'-recovery'),formatVersion:1,fields:value}),kind,current as Record<string,unknown>)
      continue
    }
    if(key==='estimated_minutes'){
      if(value!==null&&(!Number.isInteger(value)||Number(value)<1||Number(value)>2147483647))fail('Invalid estimated minutes.')
    }else if(key==='introduction'){
      if(value!==null&&typeof value!=='string')fail('Invalid introduction.')
    }else if(enums[key]){
      if(typeof value!=='string'||!enums[key].includes(value))fail('Invalid '+key+'.')
    }else if(Array.isArray(current)){
      if(!Array.isArray(value)||value.length>1000||value.some(item=>typeof item!=='string'))fail('Invalid '+key+'.')
    }else if(typeof current!==typeof value || (typeof value==='number'&&!Number.isFinite(value))){
      fail('Invalid '+key+'.')
    }
    if(key==='passing_score'&&(Number(value)<0||Number(value)>100))fail('Invalid passing score.')
    if(key==='slidesUrl'&&value&&!/^https?:\/\//i.test(String(value)))fail('Invalid slides URL.')
    fields[key]=key==='introduction'&&value===null&&typeof current==='string'?'':value
  }
  if(!Object.keys(fields).length)fail('No restorable fields were found for this editor.')
  return fields
}
export function downloadRecovery(kind: string, fields: unknown, courseId?: string|null) {
  const url=URL.createObjectURL(new Blob([JSON.stringify({format:('bakerversity-'+kind+'-recovery'),formatVersion:2,courseId,fields},null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download=(kind+'-recovery.json');link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export function recoveryOptions<T extends object>(kind:string, fields:T, restore:(fields:Partial<T>)=>void, courseId?:string|null, disabled=false):RecoveryOptions {
  return {disabled,download:()=>downloadRecovery(kind,fields,courseId),parse:text=>parseRecovery(text,kind,fields as Record<string,unknown>,courseId),restore:value=>restore(value as Partial<T>)}
}
