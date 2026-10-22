/** Slideshow structure is shared by editor and server save validation. */
export function slideshowError(document){
 let error=''
 const permitted={slideshow:['slideshowSlide'],slideshowSlide:['image','slideshowDescription'],slideshowDescription:['paragraph','heading','bulletList','orderedList','blockMath'],paragraph:['text','hardBreak','inlineMath'],heading:['text','hardBreak','inlineMath'],bulletList:['listItem'],orderedList:['listItem'],listItem:['paragraph','heading','bulletList','orderedList'],text:[],hardBreak:[],inlineMath:[],blockMath:[],image:[]}
 function visit(node,parent,inside=false){
  if(!node||typeof node!=='object'||error)return
  if(node.type==='slideshow'){
   if(parent!=='doc'){error='Slideshows must be at the top level of the document.';return}
   inside=true
  }
  const children=Array.isArray(node.content)?node.content:[]
  if(inside){
   const allowed=permitted[node.type]
   if(!allowed||(node.content!==undefined&&!Array.isArray(node.content))||children.some(child=>!child||!allowed.includes(child.type))){error='The slideshow contains unsupported content.';return}
   if(['slideshow','slideshowDescription','bulletList','orderedList','listItem'].includes(node.type)&&!children.length){error='The slideshow contains an empty section.';return}
   if(node.type==='slideshowSlide'&&(children.length!==2||children[0].type!=='image'||children[1].type!=='slideshowDescription')){error='Each slide requires an image followed by a description.';return}
   if(node.type==='image'&&(typeof node.attrs?.src!=='string'||!node.attrs.src.trim()||typeof node.attrs?.alt!=='string'||!node.attrs.alt.trim())){error='Each slide image requires a source and alt text.';return}
   if(node.type==='listItem'&&children[0]?.type!=='paragraph'){error='Slide list items must begin with a paragraph.';return}
  }else if(['slideshowSlide','slideshowDescription'].includes(node.type)){error='Slides must belong to a slideshow.';return}
  children.forEach(child=>visit(child,node.type,inside))
 }
 visit(document,null);return error
}

/** Text downloads retain every slide, image location, caption and formula. */
export function slideshowPlainText(node){
 if(node.type==='text')return node.text??''
 if(node.type==='image')return [node.attrs?.alt,node.attrs?.title,node.attrs?.src].filter(Boolean).join('\n')
 if(['inlineMath','blockMath'].includes(node.type))return node.attrs?.latex??''
 if(node.type==='hardBreak')return '\n'
 const separator=['paragraph','heading'].includes(node.type)?'':'\n'
 return [node.type==='slideshow'?node.attrs?.title:'',(node.content??[]).map(slideshowPlainText).join(separator)].filter(Boolean).join('\n')
}
