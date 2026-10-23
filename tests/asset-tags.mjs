import assert from 'node:assert/strict'
import {normalizeAssetTags,parseAssetTags} from '../src/lib/assetTags.mjs'
assert.deepEqual(parseAssetTags(' localization, Localization, , module 1, YAML '),['localization','module 1','YAML'])
assert.deepEqual(parseAssetTags(''),[])
assert.deepEqual(normalizeAssetTags(['Żółć','Żółć']),['Żółć'])
for(const input of [null,'tag',[null],['x'.repeat(51)],['bad,tag'],['bad\ntag'],Array.from({length:21},(_,i)=>String(i))])assert.throws(()=>normalizeAssetTags(input))
assert.deepEqual(parseAssetTags('C++, .NET, 100%'),['C++','.NET','100%'])
console.log('PASS: tag cleanup, case-insensitive duplicates, Unicode, optional empties and limits')
