import assert from 'node:assert/strict'
import {getSchema, getText, getTextSerializersFromSchema} from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {EditorState} from '@tiptap/pm/state'
import {history,undo} from '@tiptap/pm/history'
import {TextImageExtension,TextImageBody} from '../src/components/editor/TextImageExtension.ts'
import {textImageError,imagePlainText} from '../src/lib/textImage.mjs'
import {renderNode} from '../src/components/renderer/renderNode.ts'
import {jsonToMarkdown} from '../src/lib/lessonMarkdown.ts'
import {htmlDownloadDocument} from '../src/lib/lessonExport.mjs'
const schema=getSchema([StarterKit,Image.extend({renderText:({node})=>imagePlainText(node.attrs)}),TextImageExtension,TextImageBody])
const image={type:'image',attrs:{src:'/diagram.png',alt:'Diagram',title:'Image caption'}}
const body={type:'textImageBody',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Heading'}]},{type:'paragraph',content:[{type:'text',text:'Body text',marks:[{type:'bold'}]}]}]}
for(const children of [[image,body],[body,image]]){
 const value={type:'doc',content:[{type:'textImage',content:children}]}
 assert.equal(textImageError(value),'')
 const doc=schema.nodeFromJSON(value);doc.check()
 assert.deepEqual(schema.nodeFromJSON(doc.toJSON()).toJSON(),doc.toJSON())
 const plain=getText(doc,{textSerializers:getTextSerializersFromSchema(schema)})
 assert.match(plain,/Diagram\nImage caption\n\/diagram.png/)
 assert.equal(plain.indexOf('Diagram')<plain.indexOf('Heading'),children[0]===image)
 const spec=doc.firstChild.type.spec.toDOM(doc.firstChild)
 assert.equal(spec[0],'section');assert.equal(spec[2][1].class,'text-image-grid')
 const html=renderNode(doc.toJSON());assert.match(html,/text-image-grid/);assert.match(html,/Image caption/)
 assert.equal(html.indexOf('Diagram')<html.indexOf('Heading'),children[0]===image)
 const md=jsonToMarkdown(doc.toJSON());assert.match(md,/!\[Diagram\]\(<\/diagram.png>\)/);assert.match(md,/Image caption/)
 assert.equal(md.indexOf('Diagram')<md.indexOf('Heading'),children[0]===image)
 const plugins=TextImageExtension.config.addProseMirrorPlugins.call({})
 let state=EditorState.create({schema,doc,plugins:[...plugins,history()]})
 const replacement=schema.nodes.textImage.create(null,[doc.firstChild.child(1),doc.firstChild.child(0)])
 state=state.applyTransaction(state.tr.replaceWith(0,doc.firstChild.nodeSize,replacement)).state
 assert.equal(state.doc.firstChild.firstChild.type.name,children[1].type)
 assert.ok(undo(state,tr=>{state=state.applyTransaction(tr).state}))
 assert.deepEqual(state.doc.toJSON(),doc.toJSON())
 const illegal=schema.nodes.blockquote.create(null,doc.firstChild)
 const result=state.applyTransaction(state.tr.replaceWith(0,state.doc.content.size,illegal))
 assert.equal(result.transactions.length,0)
}
assert.ok(textImageError({type:'doc',content:[{type:'callout',content:[{type:'textImage',content:[image,body]}]}]}))
assert.ok(textImageError({type:'doc',content:[{type:'textImage',content:[image]}]}))
assert.ok(textImageError({type:'doc',content:[{type:'textImage',content:[{...image,attrs:{src:'/x',alt:' '}},body]}]}))
assert.ok(textImageError({type:'doc',content:[{type:'textImage',content:[image,{type:'textImageBody',content:[{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph'},{type:'codeBlock'}]}]}]}]}]}))
assert.equal(textImageError({type:'doc',content:[{type:'codeBlock'}]}),'')
assert.match(htmlDownloadDocument('fixture'),/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/)
assert.match(htmlDownloadDocument('fixture'),/@container \(max-width: 540px\)/)
console.log('PASS: text/image schema, both reading orders, undo, root-only filtering, validation, rendering and Markdown')

assert.ok(textImageError({type:'doc',content:[{type:'textImage',content:[null]}]}))

// Navigating out never inserts empty paragraphs; typing at a gap creates one on demand.
const {Selection,TextSelection,NodeSelection}=await import('@tiptap/pm/state')
const {GapCursor}=await import('@tiptap/pm/gapcursor')
const {textImageExitSelection,textImageBoundarySelection}=await import('../src/components/editor/TextImageExtension.ts')
for(const children of [[image,body],[body,image]]){
 const doc=schema.nodeFromJSON({type:'doc',content:[{type:'textImage',content:children}]})
 let state=EditorState.create({schema,doc,plugins:[history()]})
 for(const direction of [-1,1]){
  const inside=Selection.findFrom(doc.resolve(direction===-1?0:doc.content.size),direction===-1?1:-1,true)
  state=state.apply(state.tr.setSelection(inside))
  const outside=textImageExitSelection(state,direction)
  assert.ok(outside instanceof GapCursor)
  assert.equal(outside.from,direction===-1?0:doc.content.size)
  assert.ok(GapCursor.valid(outside.$from))
  state=state.apply(state.tr.setSelection(outside))
  assert.deepEqual(state.doc.toJSON(),doc.toJSON())
  const typed=state.apply(state.tr.insertText('Outside'))
  assert.equal((direction===-1?typed.doc.firstChild:typed.doc.lastChild).type.name,'paragraph')
  assert.equal(textImageError(typed.doc.toJSON()),'')
  const editor={get state(){return state},view:{dispatch(tr){state=state.apply(tr)}}}
  const keys=TextImageExtension.config.addKeyboardShortcuts.call({editor})
  assert.equal(keys.Enter(),true)
  assert.equal(state.selection.$from.parent.type.name,'paragraph')
  assert.equal(state.doc.childCount,2)
  state=EditorState.create({schema,doc})
 }
 const first=Selection.findFrom(doc.resolve(0),1,true)
 state=state.apply(state.tr.setSelection(TextSelection.create(doc,first.from+1)))
 assert.equal(textImageExitSelection(state,-1),null)
 state=state.apply(state.tr.setSelection(NodeSelection.create(doc,0)))
 assert.ok(textImageExitSelection(state,1) instanceof GapCursor)
 const paragraph=schema.nodes.paragraph.create(null,schema.text('Existing'))
 const surrounded=schema.nodes.doc.create(null,[paragraph,doc.firstChild,paragraph])
 const around=EditorState.create({schema,doc:surrounded})
 for(const direction of [-1,1]){
  const outside=textImageBoundarySelection(around,paragraph.nodeSize,doc.firstChild.nodeSize,direction)
  assert.ok(outside instanceof TextSelection)
  assert.equal(outside.$from.parent.textContent,'Existing')
 }
}
console.log('PASS: component boundary navigation, existing paragraphs, gap typing and Enter without navigation mutations')

for(const alignment of ['top','center','bottom']){
 const value={type:'doc',content:[{type:'textImage',attrs:{textVerticalAlign:alignment},content:[image,body]}]}
 const doc=schema.nodeFromJSON(value);doc.check()
 assert.equal(schema.nodeFromJSON(doc.toJSON()).firstChild.attrs.textVerticalAlign,alignment)
 assert.equal(doc.firstChild.type.spec.toDOM(doc.firstChild)[1]['data-text-vertical-align'],alignment)
 assert.ok(renderNode(doc.toJSON()).includes('data-text-vertical-align="'+alignment+'"'))
 assert.equal(textImageError(value),'')
}
assert.equal(schema.nodeFromJSON({type:'textImage',content:[image,body]}).attrs.textVerticalAlign,'top')
assert.ok(renderNode({type:'textImage',attrs:{textVerticalAlign:'bad" onclick="bad'},content:[image,body]}).includes('data-text-vertical-align="top"'))
console.log('PASS: component text alignment defaults, persisted choices, safe rendering and HTML serialization')
