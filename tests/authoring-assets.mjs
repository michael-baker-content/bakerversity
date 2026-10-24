import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {requestJson,AuthoringRequestError} from '../src/lib/authoring/request.ts'
const exports={}
const source=fs.readFileSync(new URL('../src/lib/authoring/assets.ts',import.meta.url),'utf8')
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,FormData,encodeURIComponent,Error,JSON,require:name=>{assert.equal(name,'./request');return {requestJson}}})
const {uploadCourseAsset,saveAssetMetadata,assetEndpoint}=exports
const original=globalThis.fetch
let calls=[],result={asset_id:'asset',url:'https://storage.test/image.png'},status=200,fail=false
try{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});if(fail)throw Error('Connection lost');return Response.json(result,{status})}
 const file=new File(['image'],'日本語.png',{type:'image/png'})
 const image=await uploadCourseAsset(file,'course/id')
 assert.equal(image.asset_id,'asset')
 assert.equal(calls[0].url,'/api/admin/assets?course_id=course%2Fid&kind=image')
 assert.equal(calls[0].init.body.get('file').name,'日本語.png')
 assert.equal(calls[0].init.headers,undefined)
 calls=[];await uploadCourseAsset(new File(['pdf'],'slides.pdf',{type:'application/pdf'}),'course','resource')
 assert.equal(calls[0].url,'/api/admin/assets?course_id=course&kind=resource')
 calls=[];await saveAssetMetadata(assetEndpoint('course'),{id:'asset',tags:['Japanese']})
 assert.deepEqual(JSON.parse(calls[0].init.body),{id:'asset',tags:['Japanese']})
 assert.equal(calls[0].init.method,'PATCH')
 for(const invalid of [{url:'https://storage.test/image.png'},{asset_id:'asset'},{}]){result=invalid;calls=[];await assert.rejects(uploadCourseAsset(file,'course'),/incomplete/);assert.equal(calls.length,1)}
 status=403;result={error:'Forbidden'};await assert.rejects(uploadCourseAsset(file,'course'),/Forbidden/)
 status=200;fail=true;calls=[]
 await assert.rejects(uploadCourseAsset(file,'course'),e=>e instanceof AuthoringRequestError&&e.uncertain)
 assert.equal(calls.length,1)
 calls=[];await assert.rejects(saveAssetMetadata(assetEndpoint('course'),{id:'asset',caption:'Caption',alt_text:'Alt'}),e=>e.uncertain);assert.equal(calls.length,1)
}finally{globalThis.fetch=original}
console.log('PASS: shared asset uploads, metadata-only patches, encoded course scope, malformed responses, access failures and no mutation retries')
