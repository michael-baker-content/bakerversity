import assert from 'node:assert/strict'
import {markdownWithFrontmatter} from '../src/lib/markdownFrontmatter.mjs'
import {jsonToMarkdown} from '../src/lib/lessonMarkdown.ts'
const title='日本語: "Files"\n---\nadmin: true'
const body=jsonToMarkdown({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Lesson body'}]}]})
const metadata={title,kind:'lesson',course_slug:'localization',estimated_minutes:0,is_required:false,module_id:null,unknown:'excluded',passing_score:NaN}
const output=markdownWithFrontmatter(body,metadata)
assert.ok(output.startsWith('---\nbakerversity_export: 1\ncontent_source: "editor"\n'))
const close=output.indexOf('\n---\n',4)
assert.ok(close>0)
assert.equal(output.slice(close+6),body)
const header=output.slice(4,close).split('\n')
assert.equal(JSON.parse(header.find(line=>line.startsWith('title: ')).slice(7)),title)
assert.ok(header.includes('estimated_minutes: 0'))
assert.ok(header.includes('is_required: false'))
for(const field of ['module_id:','unknown:','passing_score:','admin:'])assert.ok(!header.some(line=>line.startsWith(field)))
assert.equal(markdownWithFrontmatter(body,metadata),output)
assert.ok(markdownWithFrontmatter(body,{title:'Updated'}).includes('title: "Updated"'))
assert.equal(markdownWithFrontmatter(''), '---\nbakerversity_export: 1\ncontent_source: "editor"\n---\n\n')
console.log('PASS: Markdown frontmatter, Unicode/quoted/multiline values, false/zero preservation, stable output and unchanged body')
