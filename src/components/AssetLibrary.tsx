'use client'
import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/authoring/request'
import { resourcePurposes, resourceSelection, type ResourcePurpose, type ResourceSelection } from '@/lib/authoring/resources'

type Asset = { id: string; title: string; url: string; alt_text: string | null; byte_size: number; item_assets: { item_id: string }[] }
interface Props { value?: ResourceSelection[]; onChange?: (value: ResourceSelection[]) => void; disabled?: boolean }
export default function AssetLibrary({ value = [], onChange, disabled = false }: Props) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [purpose, setPurpose] = useState<ResourcePurpose>('download')
  async function load() { setAssets(await requestJson<Asset[]>('/api/admin/assets')) }
  useEffect(() => { load().catch(e => setMessage(e.message)) }, [])
  async function upload(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      const body = new FormData(); body.append('file', file)
      await requestJson('/api/admin/assets', { method: 'POST', body }, 'resource upload')
      await load(); setMessage('File uploaded to the library. Select it below to include it in this item.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Upload failed') }
    finally { setBusy(false) }
  }
  function attach(asset: Asset) {
    if (!onChange) return
    try {
      onChange(resourceSelection([...value, { asset_id: asset.id, purpose }]))
      setMessage('Selection changed. Save the item to keep it as a draft, or publish to make it visible to learners.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to select resource') }
  }
  return <details style={{ margin: '16px 0', padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}><summary>Resource library</summary>
    <p>Reuse files across lessons. Uploaded files have public URLs. Attaching a file to an item follows that item’s draft and publication settings.</p>
    <input aria-label="Upload course resource" type="file" disabled={busy || disabled} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
    {onChange && <>
      <p>Resource selections are saved with this item. Uploading or copying a link does not publish an attachment.</p>
      <label>Resource purpose<select className="input" value={purpose} disabled={disabled} onChange={e => setPurpose(e.target.value as ResourcePurpose)}>{resourcePurposes.map(p => <option key={p}>{p}</option>)}</select></label>
      <h3>Selected resources</h3>
      {value.length === 0 ? <p>No attached resources selected.</p> : <ul>{value.map(row => <li key={`${row.asset_id}:${row.purpose}`}>
        {assets.find(a => a.id === row.asset_id)?.title ?? 'Resource ' + row.asset_id} · {row.purpose}{' '}
        <button type="button" disabled={disabled} onClick={() => {
          onChange(value.filter(r => r.asset_id !== row.asset_id || r.purpose !== row.purpose))
          setMessage('Selection removed locally. Save a draft or publish to apply this change.')
        }}>Remove from item</button>
      </li>)}</ul>}
    </>}
    <p role="status">{message}</p>
    {assets.map(a => <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a> · {Math.ceil(a.byte_size / 1024)} KB · {a.item_assets.length} saved associations{' '}
      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
        try { await navigator.clipboard.writeText(a.url); setMessage('Resource link copied.') }
        catch { setMessage('Unable to copy automatically. Use the resource link instead.') }
      }}>Copy link</button>
      {onChange && <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || value.some(r => r.asset_id === a.id && r.purpose === purpose)} onClick={() => attach(a)}>
        {value.some(r => r.asset_id === a.id && r.purpose === purpose) ? 'Selected' : 'Select resource'}
      </button>}
    </div>)}
  </details>
}
