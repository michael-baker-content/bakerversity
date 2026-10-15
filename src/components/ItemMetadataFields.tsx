'use client'
export interface ItemMetadata {
  is_required: boolean
  estimated_minutes: number | null
  activity_type: string
  placement: string
}
export function itemMetadata(data: Partial<ItemMetadata>, kind: 'lesson' | 'page' | 'assessment'): ItemMetadata {
  return { is_required: data.is_required ?? kind !== 'page', estimated_minutes: data.estimated_minutes ?? null, activity_type: data.activity_type ?? (kind === 'assessment' ? 'assessment' : kind === 'page' ? 'reference' : 'explanation'), placement: data.placement ?? 'body' }
}
export default function ItemMetadataFields({ value, onChange }: { value: ItemMetadata; onChange: (v: ItemMetadata) => void }) {
  return <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, display: 'grid', gap: 12 }}>
    <legend>Learning settings</legend>
    <label><input type="checkbox" checked={value.is_required} onChange={e => onChange({ ...value, is_required: e.target.checked })} /> Required for course completion</label>
    <label>Estimated minutes<input className="input" type="number" min="1" value={value.estimated_minutes ?? ''} onChange={e => onChange({ ...value, estimated_minutes: e.target.value ? Number(e.target.value) : null })} /></label>
    <label>Activity<select className="input" value={value.activity_type} onChange={e => onChange({ ...value, activity_type: e.target.value })}>{['explanation', 'tutorial', 'lab', 'reference', 'reflection', 'assessment'].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
    <label>Course placement<select className="input" value={value.placement} onChange={e => onChange({ ...value, placement: e.target.value })}>{['introduction', 'body', 'conclusion'].map(x => <option key={x} value={x}>{x}</option>)}</select><small>Items inside a module use the module’s position.</small></label>
  </fieldset>
}
