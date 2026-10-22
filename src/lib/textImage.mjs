import {slideshowError} from './slideshow.mjs'
/** Validate only this component contract; leave existing document types untouched. */
export function textImageError(document) {
 let error=slideshowError(document)
 const allowed=new Set(['paragraph','heading','bulletList','orderedList','listItem','text','hardBreak'])
 function visit(node,parent,inBody=false){
  if(!node||typeof node!=='object'||error)return
  const children=Array.isArray(node.content)?node.content:[]
  if(inBody||node.type==='textImage'||node.type==='textImageBody'){
   if((node.content!==undefined&&!Array.isArray(node.content))||children.some(child=>!child||typeof child!=='object'||Array.isArray(child))){error='The component content is malformed.';return}
  }
  if(node.type==='textImage'){
   if(parent!=='doc') {error='Text and image components must be at the top level of the document.';return}
   if(children.length!==2||children.filter(n=>n.type==='image').length!==1||children.filter(n=>n.type==='textImageBody').length!==1){error='Text and image requires one image and one text area.';return}
   const image=children.find(n=>n.type==='image')
   if(typeof image.attrs?.src!=='string'||!image.attrs.src.trim()||typeof image.attrs?.alt!=='string'||!image.attrs.alt.trim()){error='The component image requires a source and alt text.';return}
  }
  if(node.type==='textImageBody'){
   if(parent!=='textImage'||!children.length||children.some(n=>!['paragraph','heading','bulletList','orderedList'].includes(n.type))){error='The component text area must contain paragraphs, headings or lists.';return}
   inBody=true
  }else if(inBody&&!allowed.has(node.type)){error='The component text area supports text, headings and lists only.';return}
  if(inBody){
   const permitted={paragraph:['text','hardBreak'],heading:['text','hardBreak'],bulletList:['listItem'],orderedList:['listItem'],listItem:['paragraph','heading','bulletList','orderedList'],text:[],hardBreak:[]}[node.type]
   if(permitted && children.some(child=>!permitted.includes(child.type))){error='The component text structure is invalid.';return}
   if(['bulletList','orderedList','listItem'].includes(node.type)&&!children.length){error='Component lists cannot be empty.';return}
   if(node.type==='listItem'&&children[0]?.type!=='paragraph'){error='Each component list item must start with a paragraph.';return}
  }
  children.forEach(child=>visit(child,node.type,inBody))
 }
 visit(document,null)
 return error
}

export function imagePlainText(attrs){return [attrs.alt,attrs.title,attrs.src].filter(value=>typeof value==='string'&&value).join('\n')}

/** Safe default for older components and untrusted attributes. */
export function textImageVerticalAlign(value){return value==='center'||value==='bottom'?value:'top'}
