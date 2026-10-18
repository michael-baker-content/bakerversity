'use client'
import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { closeHistory } from '@tiptap/pm/history'
import { activateLatex, findLatex, type LatexCandidate } from './latexActivation'

export default function LatexActivation({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [candidates, setCandidates] = useState(() => findLatex(editor.state.doc))
  const [message, setMessage] = useState('')
  useEffect(() => {
    const update = () => setCandidates(findLatex(editor.state.doc))
    editor.on('update', update)
    update()
    return () => { editor.off('update', update) }
  }, [editor])
  function activate(candidate?: LatexCandidate) {
    if (!editor.isEditable) return
    // Rescan at the time of the action, never apply stale document offsets.
    const current = findLatex(editor.state.doc)
    const chosen = candidate ? current.filter(item => item.from === candidate.from && item.to === candidate.to && item.latex === candidate.latex) : current
    if (!chosen.length) { setCandidates(current); return }
    editor.view.dispatch(activateLatex(closeHistory(editor.state.tr), chosen))
    editor.view.dispatch(closeHistory(editor.state.tr))
    setMessage(`Activated ${chosen.length} ${chosen.length === 1 ? 'expression' : 'expressions'}. Use Undo to restore the text.`)
  }
  return <section aria-label="Activate LaTeX expressions" style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--surface)', maxHeight: 320, overflowY: 'auto' }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 14 }}>{candidates.length} {candidates.length === 1 ? 'expression' : 'expressions'} ready</strong>
      <button type="button" className="btn btn-secondary btn-sm" disabled={!candidates.length} onClick={() => activate()}>Activate all</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
    </div>
    <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Review detected LaTeX below. Code, existing formulas and expressions that cannot render are left unchanged.</p>
    <p role="status" style={{ fontSize: 12 }}>{message || (candidates.length ? 'Choose one expression or activate all.' : 'No supported LaTeX expressions found.')}</p>
    {candidates.map((item, index) => <div key={`${item.from}:${item.to}`} style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid var(--border)', padding: '8px 0' }}>
      <code style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 }}>{item.latex}</code>
      <span style={{ fontSize: 12 }}>{item.display ? 'Display' : 'Inline'}</span>
      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Activate expression ${index + 1}: ${item.latex}`} onClick={() => activate(item)}>Activate</button>
    </div>)}
  </section>
}
