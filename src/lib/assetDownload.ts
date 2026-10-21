import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { assetDownloadName } from './assetNames.mjs'
export async function handleAssetDownload(req:Request,db:SupabaseClient<Database>,user:{id:string;role:string}|null) {
  const params=new URL(req.url).searchParams
  const courseId=params.get('course_id'),assetId=params.get('asset_id'),itemId=params.get('item_id')
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if(!courseId||!assetId||!uuid.test(courseId)||!uuid.test(assetId)||(itemId&&!uuid.test(itemId)))return Response.json({error:'Invalid resource request.'},{status:400})
  const {data:course,error:courseError}=await db.from('courses').select('id,instructor_id,is_published,is_public,price_cents,archived_at').eq('id',courseId).maybeSingle()
  if(courseError)return Response.json({error:'Unable to check course access.'},{status:500})
  if(!course||course.archived_at)return Response.json({error:'Resource unavailable.'},{status:404})
  const owner=user?.role==='admin'||(user?.role==='instructor'&&user.id===course.instructor_id)
  if(!owner) {
    if(!course.is_published||!itemId)return Response.json({error:'Resource unavailable.'},{status:404})
    if(!user&&(!course.is_public||course.price_cents>0))return Response.json({error:'Sign in to access this resource.'},{status:401})
    if(user&&course.price_cents>0) {
      const {data:enrollment,error}=await db.from('enrollments').select('id').eq('user_id',user.id).eq('course_id',courseId).maybeSingle()
      if(error||!enrollment)return Response.json({error:'Course enrollment required.'},{status:403})
    }
    const {data:item}=await db.from('course_items').select('id').eq('id',itemId).eq('course_id',courseId).eq('status','published').maybeSingle()
    const {data:attachment}=await db.from('item_assets').select('asset_id').eq('item_id',itemId).eq('asset_id',assetId).limit(1)
    if(!item||!attachment?.length)return Response.json({error:'Resource unavailable.'},{status:404})
  }
  const {data:membership,error}=await db.from('course_assets').select('display_name,assets!inner(title,original_filename,bucket,object_path,external_url)').eq('course_id',courseId).eq('asset_id',assetId).maybeSingle()
  if(error)return Response.json({error:'Unable to load resource details.'},{status:500})
  const asset=membership?.assets
  if(!asset||!asset.bucket||!asset.object_path||asset.external_url)return Response.json({error:'A named download is available only for uploaded files.'},{status:404})
  const filename=assetDownloadName(membership.display_name??asset.title,asset.object_path||asset.original_filename)
  const {data:signed,error:signError}=await db.storage.from(asset.bucket).createSignedUrl(asset.object_path,60,{download:filename})
  if(signError||!signed)return Response.json({error:'Unable to prepare the download. Please try again.'},{status:502})
  return new Response(null,{status:303,headers:{Location:signed.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})
}
