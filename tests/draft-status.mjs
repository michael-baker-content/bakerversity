import assert from 'node:assert/strict'
import {savedDraftDiffers} from '../src/lib/draftStatus.mjs'
const live={title:'Lesson',content:{type:'doc',content:[{type:'paragraph'}]},is_published:true,module_id:'module',page_type:'overview',intro_content:{type:'doc'},passing_score:80}
assert.equal(savedDraftDiffers(live,null),false)
assert.equal(savedDraftDiffers(live,{...live,version:20,updated_at:'later',is_published:false}),false)
assert.equal(savedDraftDiffers(live,{content:{content:[{type:'paragraph'}],type:'doc'}}),false)
for(const patch of [{title:'Changed'},{content:{type:'doc',content:[]}},{module_id:'other'},{page_type:'syllabus'},{intro_content:{type:'doc',content:[]}},{passing_score:90}])assert.equal(savedDraftDiffers(live,{...live,...patch}),true)
const resources=[{asset_id:'one',purpose:'download'},{asset_id:'two',purpose:'image'}]
assert.equal(savedDraftDiffers(live,{...live,resources:[...resources].reverse()},resources),false)
assert.equal(savedDraftDiffers(live,{...live,resources:[]},resources),true)
assert.equal(savedDraftDiffers(live,{...live,resources},[]),true)
assert.equal(savedDraftDiffers(live,{...live},resources),false)
console.log('PASS: overview draft differences, metadata exclusions, all item types and resource changes')
