import assert from 'node:assert/strict'
import {parseMarkdownImport as parse} from '../src/lib/markdownImport.mjs'
import {markdownWithFrontmatter} from '../src/lib/markdownFrontmatter.mjs'
const wrap = header => '---\n'+header+'\n---\nBody'
const roundtrip=parse(markdownWithFrontmatter('Hello 日本語',{title:'Lesson: 日本語',is_required:false}))
assert.equal(roundtrip.metadata.title,'Lesson: 日本語')
assert.equal(roundtrip.metadata.is_required,false)
assert.equal(roundtrip.body.trim(),'Hello 日本語')
const partial=parse(wrap('title: Good\ncourse_id: forbidden\nmodule_id: forbidden\nis_published: true\nestimated_minutes: wrong\nis_required: false'))
assert.deepEqual(partial.metadata,{title:'Good',is_required:false})
assert.equal(partial.warnings.length,1)
assert.equal(partial.skippedByDesign,true)
assert.equal(partial.body,'Body')
assert.deepEqual(parse(wrap('title: Good\nintroduction: Hello'),['title']).metadata,{title:'Good'})
assert.equal(parse(wrap('title: Good\nintroduction: Hello'),['title']).warnings.length,1)
assert.deepEqual(parse(wrap('introduction: ""\nestimated_minutes: 10\nactivity_type: lab')).metadata,{introduction:'',estimated_minutes:10,activity_type:'lab'})
assert.equal(parse('Plain text').body,'Plain text')
assert.equal(parse('\uFEFF---\r\ntitle: Good\r\n---\r\nBody').metadata.title,'Good')
for(const header of ['title: [','title: One\ntitle: Two','- one','title: !custom value','title: &a value','title: '+ '['.repeat(20)+'0'+']'.repeat(20)]){
 assert.throws(()=>parse(wrap(header)),/Nothing was imported/)
}
assert.throws(()=>parse('---\ntitle: Hi'),/Nothing was imported/)
assert.throws(()=>parse(wrap('title: '+ 'x'.repeat(17000))),/Nothing was imported/)
assert.equal(parse(wrap('title: 12\nis_required: yes\nestimated_minutes: -1\nactivity_type: unknown')).warnings.length,4)
console.log('Markdown import tests passed')

const reference=parse(markdownWithFrontmatter('Body',{title:'Title',kind:'lesson',slug:'old',course_id:'old',course_slug:'old',item_id:'old',module_id:'old',placement:'body'}))
assert.equal(reference.skippedByDesign,true)
assert.deepEqual(reference.warnings,[])
assert.equal(parse('Body').skippedByDesign,false)
assert.equal(parse(wrap('custom_field: value')).warnings.length,1)
