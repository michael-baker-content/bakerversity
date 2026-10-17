import assert from 'node:assert/strict'
import { validatePdf, signSlideTicket, readSlideTicket, handleSlideUpload } from '../src/lib/slideUpload.ts'
import { uploadLessonPdf } from '../src/lib/authoring/uploadPdf.ts'
const secret = 'test-only-secret'
const owner = 'owner'
const ticket = { owner, path: 'owner/abcdef-123.pdf', name: 'slides.pdf', size: 91000, expires: Date.now() + 60000 }
const signed = signSlideTicket(ticket, secret)
assert.deepEqual(readSlideTicket(signed, owner, secret), ticket)
assert.equal(readSlideTicket(signed, 'someone-else', secret), null)
assert.equal(readSlideTicket(signed + 'a', owner, secret), null)
assert.equal(readSlideTicket(signSlideTicket({...ticket, expires: 0}, secret), owner, secret), null)
assert.equal(readSlideTicket(signSlideTicket({...ticket, path: 'owner/../other.pdf'}, secret), owner, secret), null)
for (const size of [0, -1, 52428801, '91000']) assert.equal(validatePdf('slides.pdf', size), false)
assert.equal(validatePdf('slides.exe', 1), false)
assert.equal(validatePdf('SLIDES.PDF', 52428800), true)
let storedSize = ticket.size, storedType = 'application/pdf', writes = 0, registrations = new Set()
const storage = {
  createSignedUploadUrl: async () => ({data:{signedUrl:'https://storage.test/upload'},error:null}),
  info: async () => ({ data: {size:storedSize, contentType:storedType}, error:null }),
  getPublicUrl: path => ({data:{publicUrl:`https://storage.test/public/${path}`}}),
}
const query = {select(){return this},eq(){return this},async single(){return {data:{id:'asset'},error:null}},async upsert(row, options){assert.equal(options.ignoreDuplicates,true); writes++;registrations.add(row.object_path);return {error:null}}}
const ctx = {user:{id:owner},db:{storage:{from:()=>storage},from:()=>query}}
let result = await handleSlideUpload({action:'prepare',name:'slides.pdf',size:ticket.size},ctx,secret)
assert.equal(result.status,200)
assert.ok((await result.json()).ticket)
assert.equal((await handleSlideUpload({action:'prepare',name:'bad.txt',size:5},ctx,secret)).status,400)
assert.equal((await handleSlideUpload({action:'complete',ticket:'fake'},ctx,secret)).status,400)
storedSize = 1
assert.equal((await handleSlideUpload({action:'complete',ticket:signed},ctx,secret)).status,400)
assert.equal(writes,0)
storedSize = ticket.size; storedType='text/plain'
assert.equal((await handleSlideUpload({action:'complete',ticket:signed},ctx,secret)).status,400)
storedType='application/pdf'
for (let i=0;i<2;i++) assert.equal((await handleSlideUpload({action:'complete',ticket:signed},ctx,secret)).status,200)
assert.equal(registrations.size,1)
const originalFetch=globalThis.fetch, originalXHR=globalThis.XMLHttpRequest
let transferStatus=200, transferFailure=false, calls=[]
globalThis.XMLHttpRequest=class {
 upload={}; status=200
 open(method,url){assert.equal(method,'PUT');assert.equal(url,'https://storage.test/upload')}
 setRequestHeader(){}
 send(file){assert.equal(this.timeout,300000);assert.ok(file instanceof File); this.status=transferStatus; if(transferFailure)this.onerror();else {this.upload.onprogress({lengthComputable:true,loaded:91,total:91});this.onload()}}
}
globalThis.fetch=async (url, init)=> { const body=JSON.parse(init.body); calls.push(body);return Response.json(body.action==='prepare'?{signedUrl:'https://storage.test/upload',ticket:signed}:{asset_id:'asset',url:'https://storage.test/public/slide.pdf'}) }
try {
 const file=new File(['%PDF-fixture'],'slides.pdf',{type:'application/pdf'})
 const progress=[]
 assert.equal((await uploadLessonPdf(file,n=>progress.push(n))).asset_id,'asset')
 assert.deepEqual(progress,[100]);assert.deepEqual(calls.map(c=>c.action),['prepare','complete'])
 calls=[];transferStatus=403
 await assert.rejects(uploadLessonPdf(file,()=>{}),/storage rejected.*403/)
 assert.equal(calls.length,1)
 transferFailure=true
 await assert.rejects(uploadLessonPdf(file,()=>{}),/connection to PDF storage failed/)
 globalThis.fetch=async()=>{throw new Error('timeout')}
 await assert.rejects(uploadLessonPdf(file,()=>{}),/upload service could not be reached/)
 globalThis.fetch=async()=>new Response('Unauthorized',{status:403})
 await assert.rejects(uploadLessonPdf(file,()=>{}),/session may have expired/)
} finally {globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR}
console.log('PASS: PDF validation, signed authorization, owner isolation, expiry, metadata verification, duplicate completion, direct transfer, progress and failure messages')
