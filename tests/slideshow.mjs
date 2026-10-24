import assert from 'node:assert/strict'
import {Node,getSchema,getText,getTextSerializersFromSchema} from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {EditorState,Selection} from '@tiptap/pm/state'
import {history,undo} from '@tiptap/pm/history'
import {SlideshowExtension,SlideshowSlideExtension,SlideshowDescription} from '../src/components/editor/SlideshowExtension.ts'
import {TextImageExtension,TextImageBody,textImageExitSelection} from '../src/components/editor/TextImageExtension.ts'
import {documentError} from '../src/lib/documentValidation.mjs'
import {renderNode,buildRenderPlan} from '../src/components/renderer/renderNode.ts'
import {jsonToMarkdown} from '../src/lib/lessonMarkdown.ts'
const math=(name,inline)=>Node.create({name,inline,group:inline?'inline':'block',atom:true,addAttributes(){return {latex:{default:''}}}})
const schema=getSchema([StarterKit,Image,TextImageExtension,TextImageBody,SlideshowExtension,SlideshowSlideExtension,SlideshowDescription,math('inlineMath',true),math('blockMath',false)])
const paragraph=text=>({type:'paragraph',content:[{type:'text',text}]})
const slide=(n)=>({type:'slideshowSlide',content:[{type:'image',attrs:{src:'/image'+n+'.png',alt:'Image '+n,title:'Caption '+n}},{type:'slideshowDescription',content:[paragraph('Description '+n),{type:'paragraph',content:[{type:'inlineMath',attrs:{latex:'x^2'}},{type:'text',text:'Reference',marks:[{type:'link',attrs:{href:'https://example.com/'}}]}]},{type:'blockMath',attrs:{latex:'y=2'}}]}]})
const value={type:'doc',content:[{type:'slideshow',attrs:{id:'test',title:'Examples'},content:[slide(1),slide(2)]}]}
assert.equal(documentError(value),'')
const doc=schema.nodeFromJSON(value);doc.check()
assert.deepEqual(schema.nodeFromJSON(doc.toJSON()).toJSON(),doc.toJSON())
const text=getText(doc,{textSerializers:getTextSerializersFromSchema(schema)})
for(const item of ['Examples','Caption 1','Description 2','/image1.png','/image2.png','x^2','y=2'])assert.ok(text.includes(item),item)
const md=jsonToMarkdown(doc.toJSON());assert.match(md,/Description 2/);assert.match(md,/https:\/\/example.com/);assert.ok(md.includes('$x^2$'))
const html=renderNode(doc.toJSON());assert.match(html,/Caption 2/);assert.match(html,/data-block-math="y=2"/)
assert.equal(buildRenderPlan(doc.toJSON()).islands[0].type,'slideshow')
assert.ok(html.indexOf('Description 1')<html.indexOf('Description 2'))
let state=EditorState.create({schema,doc,plugins:[...TextImageExtension.config.addProseMirrorPlugins.call({}),history()]})
const reordered=schema.nodes.slideshow.create(doc.firstChild.attrs,[doc.firstChild.child(1),doc.firstChild.child(0)])
state=state.applyTransaction(state.tr.replaceWith(0,doc.content.size,reordered)).state
assert.equal(state.doc.firstChild.firstChild.firstChild.attrs.alt,'Image 2')
assert.ok(undo(state,tr=>state=state.apply(tr)));assert.deepEqual(state.doc.toJSON(),doc.toJSON())
for(const mutate of [v=>v.content[0].content[0].content[0].attrs.alt='',v=>v.content[0].content=[],v=>v.content[0].content[0].content.reverse(),v=>v.content[0].content[0].content[1].content.push({type:'codeBlock'}),v=>v.content[0].content=[null]]){
 const invalid=structuredClone(value);mutate(invalid);assert.ok(documentError(invalid))
}
assert.ok(documentError({type:'doc',content:[{type:'blockquote',content:value.content}]}))
const end=Selection.findFrom(state.doc.resolve(state.doc.content.size),-1,true)
state=state.apply(state.tr.setSelection(end));assert.equal(textImageExitSelection(state,1)?.from,doc.content.size)
assert.equal(state.applyTransaction(state.tr.replaceWith(0,doc.content.size,schema.nodes.blockquote.create(null,doc.firstChild))).transactions.length,0)
assert.ok(!renderNode({type:'text',text:'Link',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}).includes('href'))
console.log('PASS: slideshow schema, validation, slide/description ordering, undo, boundary navigation, exports and interactive rendering')
