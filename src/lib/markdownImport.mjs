import {load,JSON_SCHEMA} from 'js-yaml'
const referenceFields=['kind','section','slug','course_id','course_slug','item_id','module_id','page_type','assessment_type','is_graded','passing_score','placement','is_published']
export const importableFields=['title','introduction','estimated_minutes','activity_type','is_required']
export function parseMarkdownImport(text,allowed=importableFields){
 const source=text.replace(/^\uFEFF/,'')
 if(!/^---[ \t]*\r?\n/.test(source))return {body:source,metadata:{},warnings:[],skippedByDesign:false}
 const lines=source.split(/\r?\n/),end=lines.findIndex((line,index)=>index>0&&/^(---|\.\.\.)[ \t]*$/.test(line))
 if(end<0)throw new Error('Frontmatter needs a closing --- line. Nothing was imported.')
 const header=lines.slice(1,end).join('\n')
 if(header.length>16384)throw new Error('Frontmatter exceeds 16 KB. Nothing was imported.')
 let values,depth=0,count=0
 try{values=load(header,{schema:JSON_SCHEMA,listener:(event,state)=>{
  if(event==='open'){depth++;if(depth>12||++count>1000)throw Error('Metadata is too complex')}
  else depth--
  if(state.anchor||Object.keys(state.anchorMap??{}).length)throw Error('YAML anchors are not supported')
 }})}catch{throw new Error('Frontmatter is malformed or uses unsupported YAML structures. Nothing was imported.')}
 if(values==null)values={}
 if(typeof values!=='object'||Array.isArray(values))throw new Error('Frontmatter must contain named fields. Nothing was imported.')
 const metadata={},warnings=[]
 let skippedByDesign=false
 for(const [key,value] of Object.entries(values)){
  if(['bakerversity_export','content_source'].includes(key))continue
  if(referenceFields.includes(key)){skippedByDesign=true;continue}
  if(!importableFields.includes(key)||!allowed.includes(key)){warnings.push('Skipped '+key+': not supported on this editing page.');continue}
  const valid=key==='title'?typeof value==='string'&&!!value.trim()&&value.length<=500:
   key==='introduction'?typeof value==='string'&&value.length<=20000:
   key==='estimated_minutes'?Number.isInteger(value)&&value>0&&value<=2147483647:
   key==='is_required'?typeof value==='boolean':
   ['explanation','tutorial','lab','reference','reflection','assessment'].includes(value)
  if(!valid){warnings.push('Skipped '+key+': invalid value.');continue}
  metadata[key]=value
 }
 return {body:lines.slice(end+1).join('\n'),metadata,warnings,skippedByDesign}
}
