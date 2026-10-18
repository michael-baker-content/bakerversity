import assert from 'node:assert/strict'
import { compactAnswerOptions, removeAnswerOption, normaliseQuestion } from '../src/lib/authoring/questions.ts'
assert.deepEqual(compactAnswerOptions(['Wrong','','Right',''], '2'),{options:['Wrong','Right'],correct_answer:'1'})
assert.deepEqual(removeAnswerOption(['A','B','C'],'2',0),{options:['B','C'],correct_answer:'1'})
assert.equal(removeAnswerOption(['A','B','C'],'1',1).correct_answer,'')
assert.throws(()=>compactAnswerOptions(['','B','C'],'0'))
assert.throws(()=>compactAnswerOptions(['A','B'],''))
assert.throws(()=>normaliseQuestion({question_type:'multiple_choice',question_text:'Choose',options:['A','B'],correct_answer:'5'}))
assert.throws(()=>normaliseQuestion({question_type:'short_answer',question_text:'Answer',accepted_answers:[' ']}))
assert.throws(()=>normaliseQuestion({question_type:'text_response',content:{type:'doc',content:[{type:'paragraph',content:[]}]}}))
assert.deepEqual(normaliseQuestion({question_type:'short_answer',question_text:'Answer',accepted_answers:[' ŻÓŁĆ ','żółć']}).accepted_answers,['żółć'])
assert.equal(normaliseQuestion({question_type:'text_response',question_text:'Explain',options:['stale'],correct_answer:'0',accepted_answers:['old']}).correct_answer,null)
console.log('PASS: choice compaction/removal preserves correct answer, invalid questions rejected, type changes clear stale grading data')
