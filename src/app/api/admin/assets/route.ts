import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import { uploadAsset } from '@/lib/assetUpload'
export async function GET(req: Request) {
 const params=new URL(req.url).searchParams, courseId=params.get('course_id')
 const ctx=await adminAccess(courseId || undefined)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 if(courseId){
  const page=Math.max(0,Math.min(10000,Number(params.get('page'))||0))
  const {data,error}=await ctx.db.from('course_assets').select('asset_id,default_alt_text,default_caption,assets(*)').eq('course_id',courseId).order('created_at',{ascending:false}).order('asset_id').range(page*50,page*50+49)
  if(error)return NextResponse.json({error:'Unable to load course library. Check that its database migration has been applied.'},{status:500})
  return NextResponse.json((data??[]).map(row=>{const a=row.assets!;return {...a,alt_text:row.default_alt_text,caption:row.default_caption,item_assets:[],url:a.external_url??(a.bucket&&a.object_path?ctx.db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl:'')}}))
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
 if(!body||typeof body.id!=='string'||typeof body.alt_text!=='string'||typeof body.caption!=='string'||body.alt_text.length>2000||body.caption.length>5000)return NextResponse.json({error:'Provide alt text (up to 2,000 characters) and caption (up to 5,000 characters).'},{status:400})
 const {data,error}=await ctx.db.from('course_assets').update({default_alt_text:body.alt_text,default_caption:body.caption}).eq('course_id',courseId).eq('asset_id',body.id).select('asset_id').maybeSingle()
 return error?NextResponse.json({error:'Unable to save image defaults.'},{status:500}):!data?NextResponse.json({error:'Asset not found in this course.'},{status:404}):NextResponse.json({ok:true})
}
