/** Author-facing insertion taxonomy. This does not define or restrict the document schema. */
export type ElementCategory = 'media' | 'technical' | 'learning' | 'components'
export type InsertToolId = 'text-image' | 'image' | 'table' | 'directory-tree' | 'formula' | 'activate-latex' | 'graph' | 'code' | 'terminal' | 'callout' | 'quiz'
export interface InsertTool {
  id: InsertToolId
  label: string
  category: ElementCategory
  requiredPack?: string
  kind: 'block' | 'action' | 'component'
  nodeTypes: readonly string[]
  parentContexts?: readonly string[]
}
export const ELEMENT_CATEGORIES: readonly { id: ElementCategory; label: string }[] = [
  { id: 'media', label: 'Media' }, { id: 'learning', label: 'Learning' }, { id: 'technical', label: 'Technical' }, { id: 'components', label: 'Components' },
]
// Component parent contexts are enforced by schema, transaction and API validation.
// Existing block insertion is unchanged outside components.
export const INSERT_TOOLS: readonly InsertTool[] = [
  { id:'text-image', label:'Text and image', category:'components', kind:'component', nodeTypes:['textImage'], parentContexts:['doc'] },
  { id:'image', label:'Image', category:'media', kind:'block', nodeTypes:['image'] },
  { id:'table', label:'Table', category:'technical', kind:'block', nodeTypes:['table'] },
  { id:'directory-tree', label:'Directory tree', category:'technical', kind:'block', nodeTypes:['directoryTree'] },
  { id:'code', label:'Code', category:'technical', requiredPack:'code', kind:'block', nodeTypes:['codeBlock'] },
  { id:'terminal', label:'Terminal', category:'technical', requiredPack:'terminal', kind:'block', nodeTypes:['terminalBlock'] },
  { id:'formula', label:'Formula', category:'technical', requiredPack:'math', kind:'action', nodeTypes:['inlineMath','blockMath'] },
  { id:'activate-latex', label:'Activate LaTeX', category:'technical', requiredPack:'math', kind:'action', nodeTypes:['inlineMath','blockMath'] },
  { id:'graph', label:'Graph', category:'technical', requiredPack:'graph', kind:'block', nodeTypes:['mafsGraph'] },
  { id:'callout', label:'Callout', category:'learning', kind:'block', nodeTypes:['callout'] },
  { id:'quiz', label:'Quiz', category:'learning', kind:'block', nodeTypes:['practiceQuiz'] },
]
export function availableInsertTools(packs: readonly string[]) {
  return INSERT_TOOLS.filter(tool => !tool.requiredPack || packs.includes(tool.requiredPack))
}
