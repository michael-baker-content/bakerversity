import {NextResponse} from 'next/server'
import {adminAccess} from '@/lib/adminAccess'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET(req:Request){
 const ctx=await adminAccess()
 if(!ctx||ctx.user.role!=='admin')return NextResponse.json({error:'Administrators only.'},{status:403})
 const params=new URL(req.url).searchParams,course=params.get('course_id')
 if(course&&!uuid.test(course))return NextResponse.json({error:'Invalid course.'},{status:400})
 const page=Math.max(0,Math.floor(Number(params.get('page'))||0))
 const entries=[]
 for(let offset=0;;offset+=500){
  let query=ctx.db.from('course_assets').select('asset_id,removed_at,assets!inner(id,title)').not('removed_at','is',null)
  if(course)query=query.eq('course_id',course)
  const {data,error}=await query.order('asset_id').order('course_id').range(offset,offset+499)
  if(error)return NextResponse.json({error:'Unable to load the deletion queue. Check that the migration is installed.'},{status:500})
  entries.push(...(data??[]));if(!data||data.length<500)break
 }
 const unique=[...new Map(entries.map(row=>[row.asset_id,row.assets!])).values()]
 const items=[]
 for(const asset of unique.slice(page*25,page*25+25)){
  const [review,job]=await Promise.all([ctx.db.rpc('asset_deletion_review',{p_asset:asset.id}),ctx.db.from('asset_deletions').select('requested_at').eq('asset_id',asset.id).maybeSingle()])
  if(review.error||job.error)return NextResponse.json({error:'Unable to verify file usage.'},{status:500})
  items.push({...asset,...(review.data as Record<string,unknown>),pending:!!job.data})
 }
 const courses=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await ctx.db.from('courses').select('id,title').order('id').range(offset,offset+499)
  if(error)return NextResponse.json({error:'Unable to load course filters.'},{status:500})
  courses.push(...(data??[]));if(!data||data.length<500)break
 }
 return NextResponse.json({items,courses:courses.sort((a,b)=>a.title.localeCompare(b.title)),total:unique.length})
}
export async function POST(req:Request){
 const ctx=await adminAccess()
 if(!ctx||ctx.user.role!=='admin')return NextResponse.json({error:'Administrators only.'},{status:403})
 const body=await req.json().catch(()=>null)
 if(!body||!uuid.test(body.asset_id??'')||typeof body.override_history!=='boolean'||typeof body.confirmation!=='string')return NextResponse.json({error:'Confirm the file to delete.'},{status:400})
 const {data:asset,error:readError}=await ctx.db.from('assets').select('title').eq('id',body.asset_id).maybeSingle()
 if(readError)return NextResponse.json({error:'Unable to verify the file.'},{status:500})
 if(!asset)return NextResponse.json({error:'File no longer exists. Refresh the queue.'},{status:404})
 if(body.confirmation!==asset.title)return NextResponse.json({error:'Type the file name exactly to confirm.'},{status:400})
 const {data,error}=await ctx.db.rpc('begin_asset_deletion',{p_asset:body.asset_id,p_author:ctx.user.id,p_override:body.override_history})
 if(error)return NextResponse.json({error:error.message},{status:error.code==='42501'?403:409})
 const job=data as {bucket:string|null;object_path:string|null;deleted_at:string|null}
 if(job.bucket&&job.object_path){
  try{
   const removed=await ctx.db.storage.from(job.bucket).remove([job.object_path])
   if(removed.error)throw removed.error
  }catch{return NextResponse.json({error:'Storage deletion could not be confirmed. The file is reserved; retry deletion from this queue.'},{status:502})}
 }
 const finished=await ctx.db.rpc('finish_asset_deletion',{p_asset:body.asset_id,p_author:ctx.user.id})
 if(finished.error)return NextResponse.json({error:'Storage was processed, but database cleanup is incomplete. Retry deletion to finish.'},{status:500})
 return NextResponse.json({ok:true})
}
