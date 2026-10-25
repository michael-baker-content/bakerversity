import {normalizeAssetTags} from '@/lib/assetTags.mjs'
import { validateAssetName, assetDownloadHref } from '@/lib/assetNames.mjs'
import { filterCourseAssets } from '@/lib/assetSearch.mjs'
import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import { uploadAsset } from '@/lib/assetUpload'
export async function GET(req: Request) {
 const params=new URL(req.url).searchParams, courseId=params.get('course_id')
 const ctx=await adminAccess(courseId || undefined)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 if(courseId){
  const page=Math.max(0,Math.min(10000,Math.floor(Number(params.get('page'))||0)))
  // Fetch membership in batches so filters cover the entire course, not just its first page.
  const rows=[]
  for(let offset=0;;offset+=500){
    let libraryQuery=ctx.db.from('course_assets').select('asset_id,display_name,tags,removed_at,default_alt_text,default_caption,assets!inner(*)').eq('course_id',courseId)
    libraryQuery=params.get('library')==='removed'?libraryQuery.not('removed_at','is',null):libraryQuery.is('removed_at',null)
    const {data,error}=await libraryQuery.order('asset_id').range(offset,offset+499)
    if(error)return NextResponse.json({error:'Unable to load course library. Check that its database migration has been applied.'},{status:500})
    rows.push(...(data??[]));if(!data||data.length<500)break
  }
  const assets=rows.map(row=>({...row.assets!,title:row.display_name??row.assets!.title,original_title:row.assets!.title,alt_text:row.default_alt_text,caption:row.default_caption,tags:row.tags,removed_at:row.removed_at}))
  const filtered=filterCourseAssets(assets,{q:(params.get('q')??'').slice(0,200),type:params.get('type')??'all',sort:params.get('sort')??'newest'})
  const items=filtered.slice(page*50,page*50+50).map(a=>({...a,item_assets:[],download_url:a.bucket&&a.object_path&&!a.external_url?assetDownloadHref(courseId,a.id):null,url:a.external_url??(a.bucket&&a.object_path?ctx.db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl:'')}))
  return NextResponse.json(params.get('summary')==='1'?{items,total:filtered.length,courseTotal:assets.length}:items)
 }
 let query=ctx.db.from('assets').select('*, item_assets(item_id)').order('created_at',{ascending:false}).limit(200)
 if(ctx.user.role!=='admin')query=query.eq('owner_id',ctx.user.id)
 const {data,error}=await query
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json((data??[]).map(a=>({...a,url:a.external_url??(a.bucket&&a.object_path?ctx.db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl:'')})))
}
export async function POST(req:Request){return uploadAsset(req,new URL(req.url).searchParams.get('kind')==='image'?'image':'resource')}
export async function PATCH(req:Request){
 const courseId=new URL(req.url).searchParams.get('course_id')
 if(!courseId)return NextResponse.json({error:'Choose a course library.'},{status:400})
 const ctx=await adminAccess(courseId)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 const body=await req.json().catch(()=>null)
 if(!body||typeof body.id!=='string')return NextResponse.json({error:'Choose an asset.'},{status:400})
 const updates:{display_name?:string;default_alt_text?:string;default_caption?:string;tags?:string[]}={}
 try{
  if(body.display_name!==undefined)updates.display_name=validateAssetName(body.display_name)
  if(body.tags!==undefined)updates.tags=normalizeAssetTags(body.tags)
  if(body.alt_text!==undefined||body.caption!==undefined){
   if(typeof body.alt_text!=='string'||typeof body.caption!=='string'||body.alt_text.length>2000||body.caption.length>5000)throw new Error('Provide alt text (up to 2,000 characters) and caption (up to 5,000 characters).')
   updates.default_alt_text=body.alt_text;updates.default_caption=body.caption
  }
  if(!Object.keys(updates).length)throw new Error('Provide asset details to update.')
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid asset details.'},{status:400})}
 const {data,error}=await ctx.db.from('course_assets').update(updates).eq('course_id',courseId).eq('asset_id',body.id).select('asset_id').maybeSingle()
 return error?NextResponse.json({error:'Unable to save asset details. Check that the asset-tags migration has been applied.'},{status:500}):!data?NextResponse.json({error:'Asset not found in this course.'},{status:404}):NextResponse.json({ok:true})
}
