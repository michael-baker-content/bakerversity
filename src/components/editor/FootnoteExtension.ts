import {Node} from '@tiptap/core'
import {footnoteText} from '../../lib/footnotes.mjs'
export const FootnoteExtension=Node.create({
 name:'footnote',group:'inline',inline:true,atom:true,selectable:true,
 addAttributes(){return {id:{default:null},body:{default:null}}},
 parseHTML(){return [{tag:'sup[data-footnote]',getAttrs:element=>{try{return {id:element.getAttribute('data-footnote'),body:JSON.parse(element.getAttribute('data-footnote-body')??'null')}}catch{return false}}}]},
 renderHTML({node}){return ['sup',{'data-footnote':node.attrs.id,'data-footnote-body':JSON.stringify(node.attrs.body)},'*']},
 renderText({node}){return '['+footnoteText(node.attrs.body)+']'},
})
