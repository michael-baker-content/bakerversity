import { Node } from '@tiptap/core'
import { Plugin, Selection, TextSelection, NodeSelection, type EditorState } from '@tiptap/pm/state'
import { GapCursor } from '@tiptap/pm/gapcursor'
import { textImageError, textImageVerticalAlign } from '../../lib/textImage.mjs'

/** Select outside the component without inserting or changing content. */
export function textImageBoundarySelection(state: EditorState, pos: number, size: number, direction: -1 | 1) {
 const boundary=state.doc.resolve(direction===-1?pos:pos+size)
 const neighbour=direction===-1?boundary.nodeBefore:boundary.nodeAfter
 if(!neighbour||neighbour.type.spec.isolating||(neighbour.isAtom&&!neighbour.isText))return new GapCursor(boundary)
 return Selection.findFrom(boundary,direction,true)
}

export function textImageExitSelection(state: EditorState, direction: -1 | 1) {
 const selection=state.selection
 if(selection instanceof NodeSelection && selection.node.type.name==='textImage')return textImageBoundarySelection(state,selection.from,selection.node.nodeSize,direction)
 const from=selection.$from
 let componentDepth=0,bodyDepth=0
 for(let depth=1;depth<=from.depth;depth++){
  if(from.node(depth).type.name==='textImage')componentDepth=depth
  if(from.node(depth).type.name==='textImageBody')bodyDepth=depth
 }
 if(!componentDepth)return null
 if(selection instanceof TextSelection){
  if(!selection.empty||!bodyDepth)return null
  const edge=Selection.findFrom(state.doc.resolve(direction===-1?from.start(bodyDepth):from.end(bodyDepth)),direction===-1?1:-1,true)
  if(!edge||edge.from!==selection.from)return null
 }else if(!(selection instanceof NodeSelection))return null
 return textImageBoundarySelection(state,from.before(componentDepth),from.node(componentDepth).nodeSize,direction)
}

export const TextImageBody = Node.create({
 name:'textImageBody', content:'(paragraph | heading | bulletList | orderedList)+', defining:true, isolating:true,
 parseHTML(){return [{tag:'div[data-text-image-body]'}]},
 renderHTML(){return ['div',{'data-text-image-body':'',class:'text-image-body'},0]},
})
export const TextImageExtension = Node.create({
 name:'textImage',group:'block',content:'(image textImageBody) | (textImageBody image)',defining:true,isolating:true,draggable:true,
 addAttributes(){return {textVerticalAlign:{default:'top',rendered:false,parseHTML:element=>textImageVerticalAlign(element.getAttribute('data-text-vertical-align'))}}},
 parseHTML(){return [{tag:'section[data-text-image]'}]},
 renderHTML({node}){return ['section',{'data-text-image':'','data-text-vertical-align':textImageVerticalAlign(node.attrs.textVerticalAlign),class:'text-image'},['div',{class:'text-image-grid'},0]]},
 addKeyboardShortcuts(){
  const move=(direction:-1|1)=>{
   const selection=textImageExitSelection(this.editor.state,direction)
   if(!selection)return false
   this.editor.view.dispatch(this.editor.state.tr.setSelection(selection).scrollIntoView())
   return true
  }
  return {
   ArrowUp:()=>move(-1),
   ArrowDown:()=>move(1),
   Enter:()=>{
    const {state,view}=this.editor
    if(!(state.selection instanceof GapCursor))return false
    const from=state.selection.$from
    if(from.depth!==0||![from.nodeBefore?.type.name,from.nodeAfter?.type.name].includes('textImage'))return false
    const transaction=state.tr.insert(from.pos,state.schema.nodes.paragraph.create())
    transaction.setSelection(TextSelection.create(transaction.doc,from.pos+1))
    view.dispatch(transaction.scrollIntoView())
    return true
   },
  }
 },
 addOptions(){return {onInvalid:(_message:string)=>{}}},
 addProseMirrorPlugins(){return [new Plugin({filterTransaction:transaction=>{
  if(!transaction.docChanged)return true
  const error=textImageError(transaction.doc.toJSON())
  if(error)this.options?.onInvalid?.(error)
  return !error
 }})]},
})
