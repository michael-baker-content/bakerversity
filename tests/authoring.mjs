import assert from 'node:assert/strict'
import { sessionReducer, initialSession, hasUnsavedChanges, canSave } from '../src/lib/authoring/session.ts'
import { requestJson, AuthoringRequestError } from '../src/lib/authoring/request.ts'

let state = sessionReducer(initialSession, { type: 'loaded', snapshot: 'original', version: 3 })
assert.equal(hasUnsavedChanges(state, 'original'), false)
assert.equal(hasUnsavedChanges(state, 'edited'), true)
state = sessionReducer(state, { type: 'saving' })
assert.equal(canSave(state), false)
state = sessionReducer(state, { type: 'saved', snapshot: 'submitted', version: 4 })
assert.equal(state.version, 4)
assert.equal(hasUnsavedChanges(state, 'typed while saving'), true)
assert.equal(hasUnsavedChanges(state, 'submitted'), false)
state = sessionReducer(state, { type: 'failed', message: 'Conflict', conflict: true, uncertain: false })
assert.equal(state.baseline, 'submitted')
assert.equal(state.version, 4)
assert.equal(canSave(state), false)
state = sessionReducer(state, { type: 'loaded', snapshot: 'latest', version: 5 })
assert.equal(canSave(state), true)
state = sessionReducer(state, { type: 'failed', message: 'Network', conflict: false, uncertain: true })
assert.equal(canSave(state), false)
state = sessionReducer(state, { type: 'failed', message: 'Validation', conflict: false, uncertain: false })
assert.equal(canSave(state), true)

const originalFetch = globalThis.fetch
let calls = 0
const mock = fn => { calls = 0; globalThis.fetch = async (...args) => { calls++; return fn(...args) } }
try {
  mock(() => new Response(JSON.stringify({ version: 6 }), { status: 200 }))
  assert.deepEqual(await requestJson('/test', { method: 'PATCH' }), { version: 6 })
  mock(() => { throw new TypeError('Offline') })
  await assert.rejects(requestJson('/test', { method: 'PATCH' }), e => e instanceof AuthoringRequestError && e.uncertain)
  assert.equal(calls, 1, 'Never automatically retry an ambiguous mutation')
  await assert.rejects(requestJson('/test'), e => !e.uncertain)
  mock(() => new Response('<html>Sign in</html>', { status: 200 }))
  await assert.rejects(requestJson('/test', { method: 'PATCH' }), e => e.uncertain)
  mock(() => new Response(JSON.stringify({ error: 'Version conflict' }), { status: 409 }))
  await assert.rejects(requestJson('/test', { method: 'PATCH' }), e => e.status === 409 && !e.uncertain)
  mock(() => new Response(JSON.stringify({ error: 'Invalid title' }), { status: 400 }))
  await assert.rejects(requestJson('/test', { method: 'PATCH' }), e => e.message === 'Invalid title' && !e.uncertain)
  mock(() => new Response('Unavailable', { status: 503 }))
  await assert.rejects(requestJson('/test', { method: 'PATCH' }), e => e.uncertain)
  mock(() => new Response('', { status: 403 }))
  await assert.rejects(requestJson('/test'), e => e.status === 403 && e.message.includes('access'))
} finally { globalThis.fetch = originalFetch }
console.log('PASS: authoring state, in-flight edits, conflict/uncertain-save blocking, response errors and no automatic mutation retries')

const { resourceSelection } = await import('../src/lib/authoring/resources.ts')
const resourceId = 'ABCDEFAB-1234-4234-8234-123456789ABC'
assert.deepEqual(resourceSelection([{asset_id:resourceId,purpose:'starter'},{asset_id:resourceId.toLowerCase(),purpose:'starter'}]), [{asset_id:resourceId.toLowerCase(),purpose:'starter'}])
assert.throws(() => resourceSelection([{asset_id:resourceId,purpose:'unknown'}]))
assert.throws(() => resourceSelection([{asset_id:resourceId,purpose:'starter',source:'published'}]))
assert.throws(() => resourceSelection(null))
console.log('PASS: resource selection validation and canonical form')

const {lessonDraftDiffers}=await import('../src/lib/lessonPreview.mjs')
const publishedLesson={is_published:true,title:'Lesson',content:{type:'doc',content:[]}}
const attachments=[{asset_id:'a',purpose:'download'},{asset_id:'b',purpose:'example'}]
const sameDraft={...publishedLesson,content:{content:[],type:'doc'},resources:[...attachments].reverse(),version:99}
assert.equal(lessonDraftDiffers(publishedLesson,sameDraft,attachments),false)
assert.equal(lessonDraftDiffers(publishedLesson,{...sameDraft,title:'Changed'},attachments),true)
assert.equal(lessonDraftDiffers(publishedLesson,{...sameDraft,resources:[]},attachments),true)
assert.equal(lessonDraftDiffers({...publishedLesson,is_published:false},sameDraft,attachments),true)
console.log('PASS: preview notice ignores identical drafts and metadata, detects content/resources and unpublished lessons')
