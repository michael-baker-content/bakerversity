import { Node } from '@tiptap/core'
import { directoryTreeColor, directoryTreeText } from '../../lib/directoryTree.mjs'
export const DirectoryTreeExtension = Node.create({
  name:'directoryTree', group:'block', atom:true, draggable:true,
  addAttributes(){return {
    color:{default:'sage',parseHTML:element=>directoryTreeColor(element.getAttribute('data-tree-color')),rendered:false},
    collapsible:{default:false,parseHTML:element=>element.getAttribute('data-tree-collapsible')==='true',rendered:false},
    copyFolders:{default:false,parseHTML:element=>element.getAttribute('data-copy-folders')==='true',rendered:false},
    source:{default:'',parseHTML:element=>element.textContent??'',rendered:false},
    title:{default:'Directory tree',parseHTML:element=>element.getAttribute('data-tree-title')??'Directory tree',rendered:false},
  }},
  parseHTML(){return [{tag:'pre[data-directory-tree]'}]},
  renderHTML({node}){return ['pre',{'data-directory-tree':'','data-tree-collapsible':node.attrs.collapsible === true ? 'true' : 'false','data-tree-color':directoryTreeColor(node.attrs.color),'data-tree-title':node.attrs.title,'data-copy-folders':node.attrs.copyFolders === true ? 'true' : 'false'},node.attrs.source]},
  renderText({node}){return directoryTreeText(node.attrs)},

})
