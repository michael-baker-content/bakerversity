'use client'
import {technicalInputProps} from '../../lib/technicalInput.mjs'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useId, useState } from 'react'
import { DirectoryTreeExtension } from './DirectoryTreeExtension'
import { HtmlSegment } from '../renderer/HtmlSegment'
import { parseDirectoryTree, renderDirectoryTree, directoryTreeColor, DIRECTORY_TREE_COLORS } from '../../lib/directoryTree.mjs'

function DirectoryTreeView({node,updateAttributes,editor,selected}:NodeViewProps) {
  const sourceId = useId()
  const [editing,setEditing] = useState(!node.attrs.source)
  const source = typeof node.attrs.source === 'string' ? node.attrs.source : ''
  const title = typeof node.attrs.title === 'string' ? node.attrs.title : ''
  const {error} = parseDirectoryTree(source)
  return <NodeViewWrapper contentEditable={false} className="directory-editor" data-selected={selected} onClick={(e:React.MouseEvent)=>e.stopPropagation()}>
    {editor.isEditable && <>
      <button type="button" className="btn btn-secondary btn-sm" aria-expanded={editing} onClick={()=>setEditing(!editing)}>{editing?'Hide tree source':'Edit directory tree'}</button>
      {editing && <div className="directory-fields" onKeyDown={e=>e.stopPropagation()}>
        <div role="group" aria-label="Directory tree color" className="directory-color-options">
          {DIRECTORY_TREE_COLORS.map(color=><button key={color.value} type="button" className="directory-color-option" data-tree-color={color.value} aria-pressed={directoryTreeColor(node.attrs.color)===color.value} onClick={()=>updateAttributes({color:color.value})}><span className="directory-color-swatch" aria-hidden="true" /><span>{color.label}<small>{color.emphasis}</small></span></button>)}
        </div>
        <label>Tree title<input className="input" value={title} maxLength={200} onChange={e=>updateAttributes({title:e.target.value})} /></label>
        <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={node.attrs.collapsible === true} onChange={e=>updateAttributes({collapsible:e.target.checked})} />Allow folders to expand and collapse</label>
        <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={node.attrs.copyFolders === true} onChange={e=>updateAttributes({copyFolders:e.target.checked})} />Show folder copy buttons</label>
        <div className="directory-source-field"><label htmlFor={sourceId}>Directory tree source</label><textarea id={sourceId} className="input" rows={10} {...technicalInputProps} maxLength={30000} value={source} onChange={e=>updateAttributes({source:e.target.value})} placeholder={'project-root/\n├── assets/\n└── index.html'} /></div>
        <p>Paste a tree with ├── and └── branches (or |-- and `--). Add “ # description” after a name for a note. Put “! ” before a name to highlight it.</p>
        {error && <p role="alert">{error} Your source text is preserved.</p>}
      </div>}
    </>}
    <HtmlSegment html={renderDirectoryTree(source,title,node.attrs.copyFolders === true, directoryTreeColor(node.attrs.color), node.attrs.collapsible === true)} />
  </NodeViewWrapper>
}

export const DirectoryTreeNode = DirectoryTreeExtension.extend({
  addNodeView(){return ReactNodeViewRenderer(DirectoryTreeView)},
})
