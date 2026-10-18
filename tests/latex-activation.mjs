import assert from 'node:assert/strict'
import { getSchema, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorState } from '@tiptap/pm/state'
import { history, undo } from '@tiptap/pm/history'
import { findLatex, activateLatex } from '../src/components/editor/latexActivation.ts'
const schema=getSchema([StarterKit,Node.create({name:'inlineMath',group:'inline',inline:true,atom:true,addAttributes(){return {latex:{default:''}}}}),Node.create({name:'blockMath',group:'block',atom:true,addAttributes(){return {latex:{default:''}}}})])
const text=(text,marks)=>({type:'text',text,...(marks?{marks}: {})});const p=(...content)=>({type:'paragraph',content});
const doc=schema.nodeFromJSON({type:'doc',content:[p(text('Before $x'),text('^2$',[{type:'bold'}]),text(' after \\(y+1\\).')),p(text('\\[')),p(text('\\frac{a}{b}')),p(text('\\]')),p(text('Price $5 and $10. Escaped \\$z\\$.')),p(text('$code$',[{type:'code'}])),{type:'codeBlock',content:[text('$$x$$')]},p({type:'inlineMath',attrs:{latex:'z'}}),p(text('Bad $\\notARealCommand{x}$'))]})
const found=findLatex(doc);assert.deepEqual(found.map(c=>c.latex),['x^2','y+1','\\frac{a}{b}']);assert.deepEqual(found.map(c=>c.display),[false,false,true]);
let state=EditorState.create({doc,plugins:[history()]});state=state.apply(activateLatex(state.tr,found));state.doc.check();assert.equal(findLatex(state.doc).length,0);assert.ok(state.doc.textContent.includes('Before '));assert.ok(state.doc.textContent.includes(' after '));assert.ok(state.doc.textContent.includes('Price $5 and $10.'));assert.ok(state.doc.textContent.includes('$code$'));
let count=0;state.doc.descendants(n=>{if(n.type.name==='blockMath')count++});assert.equal(count,1);undo(state,tr=>{state=state.apply(tr)});assert.deepEqual(state.doc.toJSON(),doc.toJSON());
state=EditorState.create({doc});state=state.apply(activateLatex(state.tr,[found[0]]));assert.equal(findLatex(state.doc).length,2);
const mixed=schema.nodeFromJSON({type:'doc',content:[p(text('Before $$x+1$$ after'))]});const converted=activateLatex(EditorState.create({doc:mixed}).tr,findLatex(mixed)).doc;converted.check();assert.equal(converted.textContent,'Before  after');
console.log('PASS: all four delimiters, formatted text, multiline display, code/currency exclusions, invalid formulas, single/all activation, surrounding content and undo')
