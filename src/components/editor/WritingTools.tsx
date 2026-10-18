'use client'

import { useId, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'

export default function WritingTools({ editor, formatting, extraFormatting, secondary }: { editor: Editor; formatting?: ReactNode; extraFormatting?: ReactNode; secondary?: ReactNode }) {
  const [more, setMore] = useState(false)
  const moreId = useId()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const search = editor.storage.findAndReplace
  const visible = editor.storage.invisibleCharacters.visibility()
  const language = editor.getAttributes('textLanguage').language ?? ''
  const selected = !editor.state.selection.empty
  const count = search.results.length
  const button = 'btn btn-ghost btn-sm'
  return (
    <div className="editor-writing-tools">
      <div className="editor-format-row" aria-label="Format text" onKeyDown={e => {if(e.key==='Escape'){setMore(false);(e.currentTarget.querySelector('.editor-more-toggle') as HTMLButtonElement)?.focus()}}}>
        <span className="editor-row-label">Text</span>
        {formatting}
        <button type="button" className="editor-tool editor-more-toggle" aria-expanded={more} aria-controls={moreId} onClick={() => setMore(!more)}>More <span aria-hidden="true">⌄</span></button>
        <div className="editor-extra-format" id={moreId} data-open={more}>
          {extraFormatting}
          <button type="button" className="editor-tool" aria-pressed={editor.isActive('highlight')} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()}>Highlight</button>
          <button type="button" className="editor-tool" aria-expanded={open} aria-controls={panelId} onClick={() => {if(open)editor.commands.clearSearch();setOpen(!open);setMore(false)}}>Find</button>
          <button type="button" className="editor-tool" title="Show invisible characters: spaces and paragraph marks" aria-label="Show invisible characters" aria-pressed={visible} onMouseDown={e => e.preventDefault()} onClick={() => editor.commands.toggleInvisibleCharacters()}>¶</button>
          <select className="editor-tool editor-text-language" aria-label="Text language" value={language} disabled={!selected} title="Select text to label its language" onChange={e => {if(e.target.value)editor.chain().focus().setMark('textLanguage',{language:e.target.value}).run();else editor.chain().focus().unsetMark('textLanguage').run()}}>
            <option value="">Language</option><option value="en">English</option><option value="pl">Polish</option>
          </select>
        </div>
      </div>
      {secondary}
      {visible && <p style={{ margin: '6px 0', color: 'var(--text-2)' }}>Editing guides only: · space, ° nonbreaking space, ¬ line break, ¶ paragraph.</p>}
      {open && <div id={panelId} role="region" aria-label="Find and replace" className="editor-search-panel" style={{ display: 'grid', gap: 8, padding: 12 }}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type === 'text') { e.preventDefault(); if (e.shiftKey) editor.commands.goToPreviousResult(); else editor.commands.goToNextResult() }
          if (e.key === 'Escape') { e.preventDefault(); editor.commands.clearSearch(); setOpen(false); editor.commands.focus() }
        }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <label style={{ flex: '1 1 180px' }}>Find text<input autoFocus className="input" value={search.searchTerm} onChange={e => editor.commands.setSearchTerm(e.target.value)} /></label>
          <label style={{ flex: '1 1 180px' }}>Replace with<input className="input" value={search.replaceTerm} onChange={e => editor.commands.setReplaceTerm(e.target.value)} /></label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label><input type="checkbox" checked={search.caseSensitive} onChange={e => editor.commands.setCaseSensitive(e.target.checked)} /> Match case</label>
          <label><input type="checkbox" checked={search.wholeWord} onChange={e => editor.commands.setWholeWord(e.target.checked)} /> Whole words</label>
          <span role="status" aria-live="polite">{count ? `${(search.currentIndex ?? 0) + 1} of ${count} matches` : search.searchTerm ? 'No matches' : 'Enter text to search'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className={button} disabled={!count} onClick={() => editor.commands.goToPreviousResult()}>Previous match</button>
          <button type="button" className={button} disabled={!count} onClick={() => editor.commands.goToNextResult()}>Next match</button>
          <button type="button" className={button} disabled={!count} onClick={() => editor.commands.replace()}>Replace match</button>
          <button type="button" className={button} disabled={!count} onClick={() => editor.commands.replaceAll()}>Replace all ({count})</button>
          <button type="button" className={button} onClick={() => { editor.commands.clearSearch(); setOpen(false); editor.commands.focus() }}>Close search</button>
        </div>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>Searches this editor’s text, including tables and callouts. Embedded quiz, formula and terminal settings are edited separately. Undo reverses replacements.</p>
      </div>}
    </div>
  )
}
