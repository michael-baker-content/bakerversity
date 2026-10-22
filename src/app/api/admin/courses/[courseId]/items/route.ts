import { courseUpdatedDrafts } from '@/lib/courseDraftStatus'
import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
type Context = { params: Promise<{courseId:string}> }
export async function GET(_req:Request,{params}:Context) {
  const {courseId}=await params; const ctx=await adminAccess(courseId)
  if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
  const [items,modules]=await Promise.all([ctx.db.from('course_items').select('*,content_drafts(item_id)').eq('course_id',courseId).order('position'),ctx.db.from('modules').select('id,title,position').eq('course_id',courseId).order('position')])
  if(items.error||modules.error)return NextResponse.json({error:'Unable to load course sequence'},{status:500})
  try {
   const updated=await courseUpdatedDrafts(ctx.db,courseId)
   return NextResponse.json({items:items.data.map(item=>({...item,has_saved_changes:updated.has(item.id)})),modules:modules.data})
  }catch{return NextResponse.json({error:'Unable to load draft status'},{status:500})}
}
export async function POST(req:Request,{params}:Context) {
  const {courseId}=await params; const ctx=await adminAccess(courseId)
  if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
  const {item_id}=await req.json()
  const {data:item}=await ctx.db.from('course_items').select('kind').eq('id',item_id).eq('course_id',courseId).single()
  if(!item)return NextResponse.json({error:'Not found'},{status:404})
  const table=item.kind==='lesson'?'lessons':item.kind==='page'?'course_pages':'assessments'
  const {error}=await ctx.db.from(table).update({archived_at:null,is_published:false}).eq('id',item_id)
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
