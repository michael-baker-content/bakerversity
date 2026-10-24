import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {documentError} from '../src/lib/documentValidation.mjs'
import {resourceSelection} from '../src/lib/authoring/resources.ts'
const exports={}
const source=fs.readFileSync(new URL('../src/lib/authoring/recovery.ts',import.meta.url),'utf8')
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,JSON,require:name=>name==='./resources'?{resourceSelection}:{documentError}})
const {recoveryOptions}=exports
const parseRecovery=(...args)=>JSON.parse(JSON.stringify(exports.parseRecovery(...args)))
const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'日本語 Polski',marks:[{type:'bold'}]}]},{type:'directoryTree',attrs:{source:'root/'}}]}
const fields={title:'Recovered',content:doc,metadata:{is_required:false,estimated_minutes:null,activity_type:'lab',placement:'body'},resources:[]}
const file=(f=fields,extra={})=>JSON.stringify({format:'bakerversity-lesson-recovery',formatVersion:2,courseId:'course',fields:f,...extra})
const template={...fields,title:'Current',content:{}}
assert.deepEqual(parseRecovery(file(), 'lesson',template,'course'),fields)
assert.deepEqual(parseRecovery(file({...fields,action:'publish',module_id:'other',id:'other',lessonSlug:'other'}),'lesson',template,'course'),fields)
assert.deepEqual(parseRecovery(file(fields,{formatVersion:1}),'lesson',template,'course'),fields)
assert.equal(parseRecovery(file({title:'Legacy',content:doc},{format:'bakerversity-new-item-recovery',formatVersion:1}),'lesson',template,'course').title,'Legacy')
assert.throws(()=>parseRecovery(file(), 'page',template,'course'),/different kind/)
assert.throws(()=>parseRecovery(file(), 'lesson',template,'other'),/original course/)
assert.throws(()=>parseRecovery(file(fields,{formatVersion:99}),'lesson',template,'course'),/version/)
assert.throws(()=>parseRecovery('{bad','lesson',template),/valid recovery/)
assert.throws(()=>parseRecovery(file({...fields,metadata:{is_required:'yes'}}),'lesson',template),/Invalid/)
assert.throws(()=>parseRecovery(file({...fields,content:{type:'doc',content:[{type:'unknown'}]}}),'lesson',template),/unsupported|structure/)
assert.throws(()=>parseRecovery(file({...fields,content:{type:'doc',content:[{type:'text',text:'bad'}]}}),'lesson',template),/structure/)
assert.throws(()=>parseRecovery(file({...fields,content:{type:'doc',content:[{type:'image',attrs:{src:'javascript:alert(1)'}}]}}),'lesson',template),/unsafe/)
assert.throws(()=>parseRecovery(file({...fields,resources:[{asset_id:'bad',purpose:'download'}]}),'lesson',template),/resource/)
assert.throws(()=>parseRecovery('x'.repeat(5000001),'lesson',template),/5 MB/)
assert.throws(()=>parseRecovery('{"__proto__":{}}','lesson',template),/valid recovery/)
let restored=null
const options=recoveryOptions('lesson',template,value=>{restored=value},'course')
options.parse(file())
assert.equal(restored,null,'Parsing must not mutate the editor')
options.restore(options.parse(file()))
assert.equal(restored.title,'Recovered')
console.log('PASS: recovery round trips, legacy files, field boundaries, malformed documents, course/type checks, and atomic parsing')
