import assert from 'node:assert/strict'
import {getSchema} from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {EditorState} from '@tiptap/pm/state'
import {history,undo} from '@tiptap/pm/history'
import {FootnoteExtension} from '../src/components/editor/FootnoteExtension.ts'
import {TextImageExtension,TextImageBody} from '../src/components/editor/TextImageExtension.ts'
import {collectFootnotes,footnoteError,footnoteText} from '../src/lib/footnotes.mjs'
import {documentError} from '../src/lib/documentValidation.mjs'
import {renderNode,buildRenderPlan} from '../src/components/renderer/renderNode.ts'
import {jsonToMarkdown} from '../src/lib/lessonMarkdown.ts'
import {markdownToTipTap} from '../src/lib/markdownToTipTap.ts'
import {availableInsertTools} from '../src/components/editor/elementCatalog.ts'
const body=text=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text,marks:[{type:'bold'}]},{type:'text',text:' Source',marks:[{type:'link',attrs:{href:'https://example.com/'}}]}]}]})
const ref=(id,text)=>({type:'footnote',attrs:{id,body:body(text)}})
const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'First'},ref('shared','Shared note'),{type:'text',text:' second'},ref('other','Other note'),ref('shared','Shared note')]}]}
const notes=collectFootnotes(doc)
assert.deepEqual(notes.map(n=>[n.id,n.number,n.references]),[['shared',1,[1,3]],['other',2,[2]]])
assert.equal(footnoteError(doc),'');assert.equal(documentError(doc),'')
const html=renderNode(doc,undefined,'page-a')
assert.equal((html.match(/role="doc-noteref"/g)??[]).length,3)
assert.match(html,/id="page-a-fn-1"/);assert.match(html,/href="#page-a-fnref-3"/)
assert.match(html,/<strong>Shared note<\/strong>/)
assert.ok(html.includes('<a target="_blank" rel="noopener noreferrer" href="https://example.com/">'))
for(const anchor of html.match(/<a[^>]*>/g)??[]){
 if(anchor.includes('href="#'))assert.ok(!anchor.includes('target='),'Footnote navigation stays in the current tab')
}
assert.equal(buildRenderPlan(doc,'page-b').islands.length,0)
assert.ok(!buildRenderPlan(doc,'page-b').html.includes('page-a'))
const md=jsonToMarkdown(doc)
assert.equal((md.match(/\[\^1\]/g)??[]).length,3)
const imported=markdownToTipTap(md)
assert.equal(footnoteError(imported),'')
assert.equal(collectFootnotes(imported).length,2)
assert.equal(collectFootnotes(imported)[0].references.length,2)
assert.ok(footnoteText(collectFootnotes(imported)[0].body).includes('Shared note'))
const withoutShared=structuredClone(doc);withoutShared.content[0].content=withoutShared.content[0].content.filter(n=>n.type!=='footnote'||n.attrs.id!=='shared')
assert.deepEqual(collectFootnotes(withoutShared).map(n=>[n.id,n.number]),[['other',1]])
const conflicting=structuredClone(doc);conflicting.content[0].content[4].attrs.body=body('Different');assert.ok(footnoteError(conflicting))
for(const invalid of [{id:'bad"id',body:body('Text')},{id:'blank',body:body('')},{id:'bad',body:{type:'doc',content:[{type:'image',attrs:{src:'x'}}]}}]){
 if(invalid.id==='blank')invalid.body={type:'doc',content:[{type:'paragraph'}]}
 assert.ok(footnoteError({type:'doc',content:[{type:'footnote',attrs:invalid}]}))
}
const schema=getSchema([StarterKit,Image,TextImageExtension,TextImageBody,FootnoteExtension]);const parsed=schema.nodeFromJSON(doc);parsed.check()
let state=EditorState.create({schema,doc:parsed,plugins:[history(),...TextImageExtension.config.addProseMirrorPlugins.call({})]})
const tr=state.tr;state.doc.descendants((node,pos)=>{if(node.type.name==='footnote'&&node.attrs.id==='shared')tr.setNodeMarkup(pos,undefined,{...node.attrs,body:body('Edited')})})
state=state.apply(tr);assert.match(footnoteText(collectFootnotes(state.doc.toJSON())[0].body),/Edited/)
assert.ok(undo(state,tr=>state=state.apply(tr)));assert.deepEqual(state.doc.toJSON(),parsed.toJSON())
const nested={type:'doc',content:[{type:'textImage',content:[{type:'image',attrs:{src:'/a.png',alt:'Image'}},{type:'textImageBody',content:doc.content}]}]}
assert.equal(documentError(nested),'');schema.nodeFromJSON(nested).check();assert.match(renderNode(nested),/role="doc-endnotes"/)
assert.equal(availableInsertTools([]).some(t=>t.id==='footnote'),false)
assert.equal(availableInsertTools(['footnotes']).some(t=>t.id==='footnote'),true)
console.log('PASS: shared footnotes, numbering, removal, rich text, scoped anchors, Markdown round-trip, validation, undo and course gating')
