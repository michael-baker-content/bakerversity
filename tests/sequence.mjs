import assert from 'node:assert/strict'
import { buildCourseSequence, sequenceItemHref } from '../src/lib/courseSequence.ts'
const base=(id,module_id=null,position=0)=>({id,slug:id,title:id,module_id,position})
const modules=[{id:'module',slug:'module',title:'Module',position:0}]
const items=buildCourseSequence({modules,lessons:[{...base('lesson','module',1)}],assessments:[{...base('final',null,0),assessment_type:'exam',placement:'conclusion'}],pages:[{...base('intro'),page_type:'custom',placement:'introduction'},{...base('module-page','module',0),page_type:'resources'},{...base('reference',null,1),page_type:'resources',placement:'body'}]})
assert.deepEqual(items.map(x=>x.id),['intro','module-page','lesson','reference','final'])
assert.equal(sequenceItemHref('course',items[2]),'/courses/course/module/lesson')
assert.equal(sequenceItemHref('course',items[1]),'/courses/course/pages/module-page')
assert.equal(sequenceItemHref('course',items[4]),'/courses/course/assessments/final')
assert.equal(new Set(items.map(x=>x.id)).size,5)
console.log('PASS: explicit placement, module pages, standalone assessments, and consistent navigation')
