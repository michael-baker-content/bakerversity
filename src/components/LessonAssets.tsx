import type { ResourceSelection } from '@/lib/authoring/resources'
import { createServiceClient } from '@/lib/supabase'
import { assetDownloadHref } from '@/lib/assetNames.mjs'

// Render only inside a learner page AFTER its course/item access checks.
export default async function LessonAssets({itemId,previewResources}:{itemId:string;previewResources?:ResourceSelection[]}) {
  const db=createServiceClient()
  let resources:{asset_id:string;purpose:string}[]|undefined=previewResources
  if(!resources) {
    const {data,error}=await db.from('item_assets').select('asset_id,purpose').eq('item_id',itemId)
    if(error)throw new Error('Unable to load course resources')
    resources=data??[]
  }
  if(!resources.length)return null
  const ids=[...new Set(resources.map(row=>row.asset_id))]
  const {data:item,error:itemError}=await db.from('course_items').select('course_id').eq('id',itemId).single()
  if(itemError||!item)throw new Error('Unable to resolve course resources')
  const [{data:assets,error},{data:names,error:nameError}]=await Promise.all([
    db.from('assets').select('id,title,bucket,object_path,external_url').in('id',ids),
    db.from('course_assets').select('asset_id,display_name').eq('course_id',item.course_id).in('asset_id',ids),
  ])
  if(error||nameError)throw new Error('Unable to load resource names')
  const nameMap=new Map(names?.map(row=>[row.asset_id,row.display_name]))
  return <section style={{borderTop:'1px solid var(--border)',marginTop:24,paddingTop:16}}><h2>Resources</h2><ul>{resources.map(row=>{
    const asset=assets?.find(a=>a.id===row.asset_id)
    if(!asset)return <li key={row.asset_id+row.purpose}>Resource unavailable</li>
    const name=nameMap.get(asset.id)??asset.title
    const stored=!!asset.bucket&&!!asset.object_path&&!asset.external_url
    const openUrl=asset.external_url??(stored?db.storage.from(asset.bucket!).getPublicUrl(asset.object_path!).data.publicUrl:'')
    const download=stored?assetDownloadHref(item.course_id,asset.id,itemId):null
    return <li key={row.asset_id+row.purpose}><a href={row.purpose==='download'&&download?download:openUrl} target={row.purpose==='download'&&download?undefined:'_blank'} rel="noreferrer">{name}</a> <small>({row.purpose})</small>{download&&row.purpose!=='download'&&<> · <a href={download} aria-label={'Download '+name}>Download</a></>}</li>
  })}</ul></section>
}
