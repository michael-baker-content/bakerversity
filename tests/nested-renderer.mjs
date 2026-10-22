import assert from 'node:assert/strict'
import {buildRenderPlan,renderNode} from '../src/components/renderer/renderNode.ts'
import {nestedContent} from './fixtures/nested-content.mjs'
const before=JSON.stringify(nestedContent)
const plan=buildRenderPlan(nestedContent)
assert.deepEqual(plan.islands.map(n=>n.type),['practiceQuiz','practiceQuiz','mafsGraph'])
assert.match(plan.html,/<div data-callout="note"[\s\S]*data-lesson-island="0"[\s\S]*<ul><li><p>List content<\/p><div data-lesson-island="1"/)
assert.match(plan.html,/<table><tr><td><p>Graph cell<\/p><div data-lesson-island="2"/)
assert.ok(plan.html.indexOf('Before nested content')<plan.html.indexOf('data-lesson-island="0"'))
assert.ok(plan.html.indexOf('data-lesson-island="2"')<plan.html.indexOf('After nested content'))
assert.match(plan.html,/Copy tree/)
assert.equal(JSON.stringify(nestedContent),before)
const plain={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Polski',marks:[{type:'bold'}]}]},{type:'blockMath',attrs:{latex:'x^2'}}]}
assert.equal(buildRenderPlan(plain).html,renderNode(plain))
assert.equal(buildRenderPlan(plain).islands.length,0)
assert.match(buildRenderPlan({type:'doc',content:[{type:'futureBlock'}]}).html,/not supported yet/)
assert.match(buildRenderPlan({type:'futureWrapper',content:[{type:'paragraph',content:[{type:'text',text:'Retained child'}]}]}).html,/Retained child/)
console.log('PASS: recursive interactive positions, wrapper preservation, static parity and unknown-node fallback')
