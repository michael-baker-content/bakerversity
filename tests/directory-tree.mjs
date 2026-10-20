import assert from 'node:assert/strict'
import {parseDirectoryTree,renderDirectoryTree} from '../src/lib/directoryTree.mjs'
import {renderNode} from '../src/components/renderer/renderNode.ts'
const source='project-root/\n├── assets/\n│   └── loc/\n│       ├── en-US/\n│       │   └── ! dialogue.json # Edit this file\n│       └── ja-JP/\n│           └── dialogue.json\n└── src/\n    └── index.html'
const parsed=parseDirectoryTree(source)
assert.equal(parsed.error,'')
const en=parsed.entries[0].children[0].children[0].children[0].children[0]
assert.equal(en.path,'project-root/assets/loc/en-US/dialogue.json')
assert.equal(en.note,'Edit this file');assert.equal(en.highlight,true)
assert.equal(parseDirectoryTree('root/\n|-- 日本語/\n|   `-- plik.json\n`-- empty/').error,'')
assert.equal(parseDirectoryTree(source.replaceAll('\n','\r\n')).error,'')
assert.ok(parseDirectoryTree('root/\n        └── lost.txt').error)
assert.ok(parseDirectoryTree('x'.repeat(30001)).error)
assert.ok(parseDirectoryTree('root\n'.repeat(501)).error)
const html=renderNode({type:'directoryTree',attrs:{source,title:'Project files'}})
assert.ok(!html.includes('<details'));assert.ok(html.includes('directory-folder'));assert.match(renderNode({type:'directoryTree',attrs:{source,collapsible:true}}),/<details open>/);assert.match(html,/Copy tree/);assert.match(html,/Copy path project-root\/assets\/loc\/en-US\/dialogue.json/)
assert.match(html,/Edit this file/);assert.match(html,/directory-highlight/)
const unsafe=renderDirectoryTree('<script>alert(1)<\/script>\n└── "evil".txt','<img src=x onerror=alert(1)>')
assert.ok(!unsafe.includes('<script>'));assert.ok(!unsafe.includes('<img'));assert.match(unsafe,/&quot;evil&quot;/)
assert.match(renderDirectoryTree('root/\n        └── lost.txt'),/lost.txt/)
console.log('PASS: directory hierarchy, annotations, Unicode, limits, safe rendering and malformed-source preservation')

// Hook calls must stay directly in the component, never in effect callbacks.
const {readFileSync}=await import('node:fs')
const {default:ts}=await import('typescript')
const rendererSource=ts.createSourceFile('HtmlSegment.tsx',readFileSync(new URL('../src/components/renderer/HtmlSegment.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
function checkHooks(node,owner=null) {
 if(ts.isFunctionDeclaration(node)||ts.isArrowFunction(node)||ts.isFunctionExpression(node))owner=node
 if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&/^use[A-Z]/.test(node.expression.text)) {
  assert.equal(owner?.name?.text,'HtmlSegment','Hooks must be called at the component level')
 }
 ts.forEachChild(node,child=>checkHooks(child,owner))
}
checkHooks(rendererSource)
console.log('PASS: renderer hooks remain at component scope')

assert.ok(!html.includes('aria-label="Copy path project-root/assets/"'))
assert.match(html,/aria-label="Copy path project-root\/src\/index.html"/)
const withFolders=renderNode({type:'directoryTree',attrs:{source,copyFolders:true}})
assert.ok(withFolders.includes('aria-label="Copy path project-root/assets/"'))
assert.ok(!renderNode({type:'directoryTree',attrs:{source,copyFolders:false}}).includes('aria-label="Copy path project-root/assets/"'))
console.log('PASS: folder copy controls default off, explicit opt-in, file copying retained')

for(const color of ['sage','indigo','amber'])assert.ok(renderNode({type:'directoryTree',attrs:{source,color}}).includes('data-tree-color="'+color+'"'))
assert.ok(renderNode({type:'directoryTree',attrs:{source}}).includes('data-tree-color="sage"'))
assert.ok(renderNode({type:'directoryTree',attrs:{source,color:'bad" onclick="alert(1)'}}).includes('data-tree-color="sage"'))
console.log('PASS: saved tree colors, default palette and invalid color fallback')

// Exercise the real schema and download serializers without a local web server.
const {getSchema,getText,getTextSerializersFromSchema}=await import('@tiptap/core')
const {default:StarterKit}=await import('@tiptap/starter-kit')
const {DirectoryTreeExtension}=await import('../src/components/editor/DirectoryTreeExtension.ts')
const {jsonToMarkdown}=await import('../src/lib/lessonMarkdown.ts')
const {htmlDownloadDocument}=await import('../src/lib/lessonExport.mjs')
const exportSource=source+'\n\n\n└── 日本語.txt # Preserve Unicode\n~~~'
const fixture={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Before'}]},{type:'directoryTree',attrs:{source:exportSource,title:'Localization files',color:'amber',copyFolders:true}},{type:'paragraph',content:[{type:'text',text:'After'}]}]}
const schema=getSchema([StarterKit,DirectoryTreeExtension])
const doc=schema.nodeFromJSON(fixture)
doc.check()
const txt=getText(doc,{textSerializers:getTextSerializersFromSchema(schema)})
assert.ok(txt.includes('Localization files\n'+exportSource))
assert.ok(txt.includes('Before'));assert.ok(txt.includes('After'))
const md=jsonToMarkdown(fixture)
assert.ok(md.includes('~~~~text\nLocalization files\n'+exportSource+'\n~~~~'))
const nested=jsonToMarkdown({type:'doc',content:[{type:'callout',attrs:{type:'note'},content:[fixture.content[1]]}]})
assert.ok(nested.includes('> Localization files'));assert.ok(nested.includes('> │   └── loc/'))
const spec=doc.child(1).type.spec.toDOM(doc.child(1))
assert.equal(spec[0],'pre');assert.equal(spec[2],exportSource)
assert.equal(spec[1]['data-tree-title'],'Localization files');assert.equal(spec[1]['data-tree-color'],'amber')
assert.equal(spec[1]['data-copy-folders'],'true')
const htmlDownload=htmlDownloadDocument('<pre data-directory-tree data-tree-title="Localization files">tree</pre>')
assert.match(htmlDownload,/<!doctype html>/);assert.match(htmlDownload,/<meta charset="utf-8">/)
assert.match(htmlDownload,/prefers-color-scheme:dark/);assert.match(htmlDownload,/@media print/)
assert.ok(!htmlDownload.includes('<script'));assert.ok(!htmlDownload.includes('Copy path'))
console.log('PASS: actual schema text export, Markdown fences and nested callouts, HTML source attributes and standalone document')

assert.equal(doc.child(1).attrs.collapsible,false)
assert.equal(spec[1]['data-tree-collapsible'],'false')
