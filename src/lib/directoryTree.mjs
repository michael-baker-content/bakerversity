export const DIRECTORY_TREE_COLORS = [
  {value:'sage',label:'Sage',emphasis:'Subtle'},
  {value:'indigo',label:'Indigo',emphasis:'Medium'},
  {value:'amber',label:'Amber',emphasis:'Strong'},
]
/** @param {unknown} value */
export function directoryTreeColor(value) {
  return DIRECTORY_TREE_COLORS.some(color=>color.value===value) ? String(value) : 'sage'
}

/** @typedef {{name:string,path:string,note:string,highlight:boolean,folder:boolean,children:TreeEntry[]}} TreeEntry */
/** Parse common Unicode/ASCII tree output without guessing malformed hierarchy.
 * @param {unknown} input @returns {{entries:TreeEntry[],error:string}} */
export function parseDirectoryTree(input) {
  const source = typeof input === 'string' ? input.replace(/\r\n?/g, '\n') : ''
  if (!source.trim()) return {entries:[],error:'Paste a directory tree to preview it.'}
  if (source.length > 30000) return {entries:[],error:'Keep the tree under 30,000 characters.'}
  const lines = source.split('\n')
  if (lines.length > 500) return {entries:[],error:'Keep the tree under 500 lines.'}
  /** @type {TreeEntry[]} */
  const entries = [], stack = []
  for (let i=0;i<lines.length;i++) {
    const line = lines[i].replace(/\t/g,'    ').trimEnd()
    if (!line.trim()) continue
    const branch = line.match(/^((?:(?:│   |\|   |    ))*)(?:├── |└── |\|-- |\+-- |`-- )(.+)$/)
    let depth = 0, text = line.trim()
    if (branch) { depth = branch[1].length/4+1; text = branch[2] }
    else if (/^[\s│|├└+`]/.test(line)) return {entries:[],error:`Line ${i+1}: use four-space tree branches such as ├── name or └── name.`}
    if (depth > 32 || depth > stack.length) return {entries:[],error:`Line ${i+1}: a parent folder is missing or the tree is too deep.`}
    const highlight = text.startsWith('! ')
    if (highlight) text = text.slice(2)
    const split = text.indexOf(' # ')
    const name = (split<0?text:text.slice(0,split)).trim()
    const note = split<0?'':text.slice(split+3).trim()
    if (!name) return {entries:[],error:`Line ${i+1}: enter a file or folder name.`}
    const parent = depth ? stack[depth-1] : null
    if (parent) parent.folder = true
    const path = (parent?parent.path.replace(/\/$/,'')+'/':'')+name
    const entry = {name,path,note,highlight,folder:name.endsWith('/'),children:[]}
    if (parent) parent.children.push(entry); else entries.push(entry)
    stack[depth]=entry; stack.length=depth+1
  }
  return {entries,error:''}
}

const escape = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
/** @param {unknown} source @param {unknown} title @param {boolean} copyFolders @param {unknown} color @param {boolean} collapsible */
export function renderDirectoryTree(source, title='Directory tree', copyFolders=false, color='sage', collapsible=false) {
  const raw = typeof source === 'string' ? source : ''
  const {entries,error} = parseDirectoryTree(raw)
  const heading = typeof title === 'string' && title.trim() ? title : 'Directory tree'
  const copy = (value,label) => `<button type="button" class="directory-copy" data-directory-copy="${escape(value)}" aria-label="${escape(label)}">Copy path</button>`
  const list = rows => `<ul>${rows.map(row=>{
    const name = `<span class="directory-icon" aria-hidden="true">${row.folder?'▱':'▤'}</span><span class="directory-name">${escape(row.name)}</span>${row.highlight?'<span class="directory-focus">Focus</span>':''}${row.note?`<span class="directory-note">${escape(row.note)}</span>`:''}`
    const button = !row.folder || copyFolders === true ? copy(row.path,`Copy path ${row.path}`) : ''
    const children = row.children.length ? list(row.children) : '<span class="directory-note">Empty folder</span>'
    if (row.folder && !collapsible) return `<li${row.highlight?' class="directory-highlight"':''}><div class="directory-folder">${name}${button}</div>${children}</li>`
    return `<li${row.highlight?' class="directory-highlight"':''}>${row.folder?`<details open><summary>${name}${button}</summary>${row.children.length?list(row.children):'<span class="directory-note">Empty folder</span>'}</details>`:`<div class="directory-file">${name}${button}</div>`}</li>`
  }).join('')}</ul>`
  return `<section class="directory-tree" data-tree-color="${directoryTreeColor(color)}" aria-label="${escape(heading)}"><div class="directory-header"><strong>${escape(heading)}</strong><button type="button" class="directory-copy" data-directory-copy="${escape(raw)}">Copy tree</button><span role="status" class="directory-status"></span></div><div class="directory-scroll" tabindex="0" role="region" aria-label="Directory structure">${error?`<pre>${escape(raw)}</pre>`:list(entries)}</div></section>`
}

/** Plain-text representation used by text and Markdown downloads.
 * @param {{source?:unknown,title?:unknown}} attrs */
export function directoryTreeText(attrs) {
  const source = typeof attrs.source === 'string' ? attrs.source : ''
  const title = typeof attrs.title === 'string' && attrs.title.trim() ? attrs.title.trim() : 'Directory tree'
  return title+'\n'+source
}
