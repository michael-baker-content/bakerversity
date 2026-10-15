import { createServiceClient } from '@/lib/supabase'
// Render only inside a learner page AFTER its course/item access checks.
export default async function LessonAssets({ itemId }: { itemId: string }) {
  const db = createServiceClient()
  const { data, error } = await db.from('item_assets').select('purpose,assets(id,title,bucket,object_path,external_url)').eq('item_id', itemId)
  if (error) throw new Error('Unable to load course resources')
  if (!data?.length) return null
  return <section style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 16 }}><h2>Resources</h2><ul>{data.map((row, index) => {
    const a = row.assets as unknown as { id: string; title: string; bucket: string; object_path: string; external_url: string | null }
    const url = a.external_url ?? db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl
    return <li key={`${a.id}-${index}`}><a href={url} target="_blank" rel="noreferrer">{a.title}</a> <small>({row.purpose})</small></li>
  })}</ul></section>
}
