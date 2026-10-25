import {NextResponse} from 'next/server'
import {adminAccess} from '@/lib/adminAccess'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
async function context(req:Request,params:Promise<{assetId:string}>){
 const {assetId}=await params,courseId=new URL(req.url).searchParams.get('course_id')
 if(!courseId||!uuid.test(courseId)||!uuid.test(assetId))return {error:NextResponse.json({error:'Choose a course asset.'},{status:400})}
 const ctx=await adminAccess(courseId)
 if(!ctx)return {error:NextResponse.json({error:'Forbidden'},{status:403})}
 const membership=await ctx.db.from('course_assets').select('asset_id').eq('course_id',courseId).eq('asset_id',assetId).maybeSingle()
 if(membership.error)return {error:NextResponse.json({error:'Unable to check the course library.'},{status:500})}
 if(!membership.data)return {error:NextResponse.json({error:'Asset not found in this course.'},{status:404})}
 return {ctx,courseId,assetId}
}
export async function GET(req:Request,{params}:{params:Promise<{assetId:string}>}){
 const result=await context(req,params)
 if(result.error)return result.error
 const {ctx,courseId,assetId}=result
 const [usage,course]=await Promise.all([
 ctx.db.rpc('course_asset_usage',{p_course:courseId,p_asset:assetId}),
 ctx.db.from('courses').select('slug').eq('id',courseId).single()
 ])
 if(usage.error||course.error)return NextResponse.json({error:'Unable to check file usage. Apply the asset-library removal migration, then retry.'},{status:500})
 return NextResponse.json({...(usage.data as Record<string,unknown>),course_slug:course.data.slug})
}
export async function PATCH(req:Request,{params}:{params:Promise<{assetId:string}>}){
 const result=await context(req,params)
 if(result.error)return result.error
 const body=await req.json().catch(()=>null)
 if(!body||typeof body.removed!=='boolean')return NextResponse.json({error:'Choose remove or restore.'},{status:400})
 const {ctx,courseId,assetId}=result
 const {data,error}=await ctx.db.rpc('set_course_asset_removed',{p_course:courseId,p_asset:assetId,p_author:ctx.user.id,p_removed:body.removed})
 if(error)return NextResponse.json({error:error.code==='23503'?'This file is still used by saved course content. Remove those references and save first.':'Unable to change library membership. Refresh and retry.'},{status:error.code==='23503'?409:error.code==='42501'?403:500})
 return NextResponse.json(data)
}
