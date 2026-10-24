import assert from 'node:assert/strict'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { searchDocument } from '@tiptap/extension-find-and-replace'
import { TextLanguage } from '../src/components/editor/TextLanguage.ts'
import { renderNode } from '../src/components/renderer/renderNode.ts'

const schema = getSchema([StarterKit, Highlight, TextLanguage])
const fixture = {type:'doc',content:[{type:'paragraph',content:[
  {type:'text',text:'żółć',marks:[{type:'textLanguage',attrs:{language:'pl'}},{type:'highlight'}]},
  {type:'text',text:' żółć żółci ŻÓŁĆ'},
]},{type:'paragraph',content:[{type:'text',text:'English',marks:[{type:'textLanguage',attrs:{language:'en'}}]}]}]}
const doc = schema.nodeFromJSON(fixture)
doc.check()
const roundTrip = schema.nodeFromJSON(doc.toJSON())
assert.equal(roundTrip.textContent, doc.textContent)
const html = renderNode(roundTrip.toJSON())
assert.match(html, /<span lang="pl-PL"><mark[^>]*>żółć<\/mark><\/span>/)
assert.match(html, /<mark style="background-color:#fef08a;color:#1f2937">/)
assert.match(html, /<span lang="en-US">English<\/span>/)
const options = {caseSensitive:false,useRegex:false,wholeWord:true}
assert.equal(searchDocument(doc,'żółć',options).length,3)
assert.equal(searchDocument(doc,'żółć',{...options,caseSensitive:true}).length,2)
assert.equal(searchDocument(doc,'absent',options).length,0)
const split = schema.nodeFromJSON({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'lo'},{type:'text',text:'kalizacja',marks:[{type:'bold'}]}]}]})
assert.equal(searchDocument(split,'lokalizacja',options).length,1)
const hostile = renderNode({type:'text',text:'<script>',marks:[{type:'textLanguage',attrs:{language:'pl" onclick="bad'}},{type:'highlight',attrs:{color:'red;bad'}}]})
assert.ok(!hostile.includes('onclick') && !hostile.includes('red;bad'))
assert.ok(hostile.includes('&lt;script&gt;'))
console.log('PASS: language/highlight schema and learner rendering; Polish whole-word search across formatting; unsafe attributes excluded')

// All additional languages survive saved JSON and render canonical HTML labels.
for (const [code, text] of [['en-US','English'],['pl-PL','Polski'],['de-DE','Grüße'],['es-ES','español'],['fr-FR','français'],['cs-CZ','čeština'],['ja-JP','日本語の文章']]) {
  const fixture = {type:'doc',content:[{type:'paragraph',content:[{type:'text',text,marks:[{type:'textLanguage',attrs:{language:code}}]}]}]}
  const saved = schema.nodeFromJSON(fixture)
  saved.check()
  assert.ok(renderNode(saved.toJSON()).includes('<span lang="'+code+'">'+text+'</span>'))
  assert.ok(renderNode({type:'text',text,marks:[{type:'textLanguage',attrs:{language:code.toLowerCase().replace('-','_')}}]}).includes('lang="'+code+'"'))
}
console.log('PASS: Supported language labels and locale normalization')

for(const href of ['https://example.com/','/courses','#section']){
 const html=renderNode({type:'text',text:'Link',marks:[{type:'link',attrs:{href,target:'_self'}}]})
 assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'))
 assert.ok(!html.includes('_self'))
}

const {isEditorLink,editorLink}=await import('../src/lib/editorLinks.mjs')
for(const href of ['https://example.com','http://example.com','mailto:author@example.com','/courses','#section'])assert.equal(isEditorLink(href),true)
for(const href of ['javascript:alert(1)','//example.com','https:bad','https://example.com bad','','#'])assert.equal(isEditorLink(href),false)
assert.deepEqual(editorLink(' https://example.com '),{href:'https://example.com',target:'_blank',rel:'noopener noreferrer'})
const {CALLOUT_TYPES,calloutDefinition}=await import('../src/lib/callouts.mjs')
for(const definition of CALLOUT_TYPES){
 const html=renderNode({type:'callout',attrs:{type:definition.value},content:[]})
 assert.ok(html.includes(definition.label))
 assert.ok(html.includes(definition.icon))
 assert.ok(html.includes(definition.bg))
}
assert.equal(calloutDefinition('unknown').value,'tip')
assert.equal(calloutDefinition('warning').border,'var(--amber)')
console.log('PASS: shared authored-link policy and callout definitions')

const {technicalHtmlAttributes}=await import('../src/lib/technicalInput.mjs')
const {default:CodeBlockLowlight}=await import('@tiptap/extension-code-block-lowlight')
const {createLowlight}=await import('lowlight')
const technicalSchema=getSchema([StarterKit.configure({codeBlock:false,code:{HTMLAttributes:technicalHtmlAttributes}}),CodeBlockLowlight.configure({lowlight:createLowlight(),HTMLAttributes:technicalHtmlAttributes})])
const technicalDoc=technicalSchema.nodeFromJSON({type:'doc',content:[{type:'codeBlock',content:[{type:'text',text:'日本語 żółć'}]},{type:'paragraph',content:[{type:'text',text:'filename',marks:[{type:'code'}]}]}]})
technicalDoc.check()
for(const spec of [technicalSchema.nodes.codeBlock.spec.toDOM(technicalDoc.child(0)),technicalSchema.marks.code.spec.toDOM(technicalSchema.marks.code.create(),true)]){
 assert.equal(spec[1].spellcheck,'false');assert.equal(spec[1].autocorrect,'off');assert.equal(spec[1].autocapitalize,'off')
}
assert.equal(technicalDoc.child(0).textContent,'日本語 żółć')
assert.ok(!JSON.stringify(technicalSchema.nodes.paragraph.spec.toDOM(technicalDoc.child(1))).includes('spellcheck'))
console.log('PASS: code spellchecking disabled without changing Unicode content or prose settings')
