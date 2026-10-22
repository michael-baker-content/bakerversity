import type {SupabaseClient} from '@supabase/supabase-js'
import type {Database} from './database.types'
import {savedDraftDiffers} from './draftStatus.mjs'

/** Fetch in batches; only status flags are sent to the overview client. */
export async function courseUpdatedDrafts(db:SupabaseClient<Database>,courseId:string):Promise<Set<string>>{
 const drafts=await db.from('content_drafts').select('item_id,snapshot,course_items!inner(course_id,status)').eq('course_items.course_id',courseId).eq('course_items.status','published')
 if(drafts.error)throw new Error('Unable to load saved draft status')
 const ids=(drafts.data??[]).map(row=>row.item_id)
 if(!ids.length)return new Set()
 const results=await Promise.all([
  db.from('lessons').select('*').eq('course_id',courseId).in('id',ids),
  db.from('course_pages').select('*').eq('course_id',courseId).in('id',ids),
  db.from('assessments').select('*').eq('course_id',courseId).in('id',ids),
  db.from('item_assets').select('item_id,asset_id,purpose').eq('source','attached').in('item_id',ids),
 ])
 if(results.some(result=>result.error))throw new Error('Unable to compare saved drafts')
 const published=new Map([...results[0].data??[],...results[1].data??[],...results[2].data??[]].map(row=>[row.id,row]))
 const resources=results[3].data??[]
 return new Set((drafts.data??[]).filter(row=>{
  const live=published.get(row.item_id)
  return live?.is_published&&savedDraftDiffers(live,row.snapshot,resources.filter(resource=>resource.item_id===row.item_id))
 }).map(row=>row.item_id))
}
