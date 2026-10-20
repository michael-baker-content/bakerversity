import type { ResourceSelection } from '@/lib/authoring/resources'
import { createServiceClient } from '@/lib/supabase'
// Render only inside a learner page AFTER its course/item access checks.
export default async function LessonAssets({ itemId, previewResources }: { itemId: string; previewResources?: ResourceSelection[] }) {
  const db = createServiceClient()
  if (previewResources) {
    if (!previewResources.length) return null
    const {data:assets,error}=await db.from('assets').select('id,title,bucket,object_path,external_url').in('id',[...new Set(previewResources.map(row=>row.asset_id))])
    if(error)throw new Error('Unable to load draft resources')
    return <section style={{borderTop:'1px solid var(--border)',marginTop:24,paddingTop:16}}><h2>Resources</h2><ul>{previewResources.map(row=>{
      const a=assets?.find(asset=>asset.id===row.asset_id)
      if(!a)return <li key={row.asset_id+row.purpose}>Resource unavailable</li>
      const url=a.external_url??(a.bucket&&a.object_path?db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl:'')
      return <li key={row.asset_id+row.purpose}><a href={url} target="_blank" rel="noreferrer">{a.title}</a> <small>({row.purpose})</small></li>
    })}</ul></section>
  }
  const { data, error } = await db.from('item_assets').select('purpose,assets(id,title,bucket,object_path,external_url)').eq('item_id', itemId)
  if (error) throw new Error('Unable to load course resources')
  if (!data?.length) return null
  return <section style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 16 }}><h2>Resources</h2><ul>{data.map((row, index) => {
    const a = row.assets as unknown as { id: string; title: string; bucket: string; object_path: string; external_url: string | null }
    const url = a.external_url ?? db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl
    return <li key={`${a.id}-${index}`}><a href={url} target="_blank" rel="noreferrer">{a.title}</a> <small>({row.purpose})</small></li>
  })}</ul></section>
}
