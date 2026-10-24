'use client'
import {useId, type FormEventHandler, type CSSProperties} from 'react'
import Link from 'next/link'

type Props = {
 title:string; description:string; error:string; saving:boolean; disabled:boolean;
 submitLabel:string; cancelHref:string; autoFocus?:boolean;
 onTitleChange:(value:string)=>void; onDescriptionChange:(value:string)=>void;
 onSubmit:FormEventHandler<HTMLFormElement>;
}
export default function ModuleForm({title,description,error,saving,disabled,submitLabel,cancelHref,autoFocus=false,onTitleChange,onDescriptionChange,onSubmit}:Props){
 const titleId=useId(),descriptionId=useId()
 return (
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label htmlFor={titleId} style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            className="input"
            type="text"
            id={titleId}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            autoFocus={autoFocus}
          />
        </div>

        <div>
          <label htmlFor={descriptionId} style={labelStyle}>Description <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
          <textarea
            id={descriptionId}
            className="input"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Brief description shown on the course page…"
          />
        </div>

        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={disabled || saving || !title} className="btn btn-primary">
            {saving ? 'Saving…' : submitLabel}
          </button>
          <Link href={cancelHref} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
 )
}
const labelStyle:CSSProperties={display:'block',fontSize:13,fontWeight:600,marginBottom:6,color:'var(--text)'}
