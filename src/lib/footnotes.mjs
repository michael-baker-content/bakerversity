export function collectFootnotes(document){
 const notes=[];const byId=new Map();let occurrence=0
 function walk(node){
  if(node?.type==='footnote'){
   const id=node.attrs?.id;let note=byId.get(id)
   if(!note){note={id,number:notes.length+1,body:node.attrs?.body,references:[]};notes.push(note);byId.set(id,note)}
   note.references.push(++occurrence);return
  }
  for(const child of node?.content??[])walk(child)
 }
 walk(document);return notes
}
export function footnoteText(node){
 if(node?.type==='text')return node.text??''
 if(node?.type==='hardBreak')return '\n'
 return (node?.content??[]).map(footnoteText).join(['paragraph','heading'].includes(node?.type)?'':'\n')
}
export function footnoteError(document){
 let error='';const definitions=new Map()
 const allowed={doc:['paragraph','bulletList','orderedList'],paragraph:['text','hardBreak'],bulletList:['listItem'],orderedList:['listItem'],listItem:['paragraph','bulletList','orderedList'],text:[],hardBreak:[]}
 function validBody(node){
  if(!node||typeof node!=='object'||!allowed[node.type]||node.content!==undefined&&!Array.isArray(node.content))return false
  const children=node.content??[]
  if(children.some(child=>!child||!allowed[node.type].includes(child.type)||!validBody(child)))return false
  if(['doc','bulletList','orderedList','listItem'].includes(node.type)&&!children.length)return false
  if(node.type==='listItem'&&children[0]?.type!=='paragraph')return false
  if(node.type==='text'&&(typeof node.text!=='string'||!node.text))return false
  if(node.marks!==undefined&&(!Array.isArray(node.marks)||node.marks.some(mark=>!['bold','italic','code','link','strike','underline'].includes(mark?.type))))return false
  return true
 }
 function walk(node){
  if(!node||error)return
  if(node.type==='footnote'){
   const {id,body}=node.attrs??{}
   if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||body?.type!=='doc'||!validBody(body)||!footnoteText(body).trim()){error='Each footnote needs an ID and text with basic formatting only.';return}
   const value=JSON.stringify(body)
   if(definitions.has(id)&&definitions.get(id)!==value){error='References to the same footnote must have the same text. Reuse the current footnote from the Footnote tool.';return}
   definitions.set(id,value);return
  }
  if(Array.isArray(node.content))node.content.forEach(walk)
 }
 walk(document);return error
}
export function footnoteReference(number,occurrence,prefix='lesson'){
 return '<sup class="footnote-reference"><a role="doc-noteref" id="'+prefix+'-fnref-'+occurrence+'" href="#'+prefix+'-fn-'+number+'" aria-label="Footnote '+number+'">'+number+'</a></sup>'
}
// Apply only to rendered note content, never reference or return anchors.
export function footnoteBodyHtml(body,renderBody){
 return renderBody(body).replace(/<a href=/g,'<a target="_blank" rel="noopener noreferrer" href=')
}
export function footnoteSection(notes,renderBody,prefix='lesson'){
 if(!notes.length)return ''
 return '<section class="footnotes" role="doc-endnotes" aria-label="Footnotes"><h2>Footnotes</h2><ol>'+notes.map(note=>'<li id="'+prefix+'-fn-'+note.number+'" tabindex="-1">'+footnoteBodyHtml(note.body,renderBody)+ '<span class="footnote-returns">'+note.references.map((ref,index)=>'<a href="#'+prefix+'-fnref-'+ref+'" aria-label="Return to footnote '+note.number+' reference '+(index+1)+'">↩'+(note.references.length>1?index+1:'')+'</a>').join(' ')+'</span></li>').join('')+'</ol></section>'
}
