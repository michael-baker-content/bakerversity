import assert from 'node:assert/strict'
import { INSERT_TOOLS, ELEMENT_CATEGORIES, availableInsertTools } from '../src/components/editor/elementCatalog.ts'
assert.equal(new Set(INSERT_TOOLS.map(t=>t.id)).size,INSERT_TOOLS.length)
for (const tool of INSERT_TOOLS) {
  assert.ok(ELEMENT_CATEGORIES.some(c=>c.id===tool.category))
  assert.ok(tool.nodeTypes.length)
  assert.ok(tool.label.trim())
}
assert.deepEqual(availableInsertTools([]).map(t=>t.id),['image','table','directory-tree','callout','quiz'])
assert.deepEqual(availableInsertTools(['math']).filter(t=>t.requiredPack).map(t=>t.id),['formula','activate-latex'])
assert.equal(availableInsertTools(['math','code','graph','terminal']).length,INSERT_TOOLS.length)
assert.deepEqual(availableInsertTools(['unknown']),availableInsertTools([]))
assert.equal(INSERT_TOOLS.find(t=>t.id==='terminal').nodeTypes[0],'terminalBlock')
assert.ok(!INSERT_TOOLS.some(t=>t.nodeTypes.includes('columns')))
console.log('Element catalog checks passed')
