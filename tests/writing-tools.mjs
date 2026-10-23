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
for (const [code, text] of [['en-US','English'],['pl-PL','Polski'],['de-DE','Grüße'],['es-ES','español'],['fr-FR','français'],['cs-CZ','čeština']]) {
  const fixture = {type:'doc',content:[{type:'paragraph',content:[{type:'text',text,marks:[{type:'textLanguage',attrs:{language:code}}]}]}]}
  const saved = schema.nodeFromJSON(fixture)
  saved.check()
  assert.ok(renderNode(saved.toJSON()).includes('<span lang="'+code+'">'+text+'</span>'))
  assert.ok(renderNode({type:'text',text,marks:[{type:'textLanguage',attrs:{language:code.toLowerCase().replace('-','_')}}]}).includes('lang="'+code+'"'))
}
console.log('PASS: German, Spanish, French and Czech language labels and locale normalization')

for(const href of ['https://example.com/','/courses','#section']){
 const html=renderNode({type:'text',text:'Link',marks:[{type:'link',attrs:{href,target:'_self'}}]})
 assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'))
 assert.ok(!html.includes('_self'))
}
