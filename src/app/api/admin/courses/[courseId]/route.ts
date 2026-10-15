import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import type { Database } from '@/lib/database.types'
type Context = { params: Promise<{courseId:string}> }
export async function GET(_req:Request,{params}:Context) {
  const {courseId}=await params;const ctx=await adminAccess(courseId)
  if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
  const {data,error}=await ctx.db.from('courses').select('*').eq('id',courseId).single()
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json(data)
}
export async function PATCH(req:Request,{params}:Context) {
  const {courseId}=await params;const ctx=await adminAccess(courseId)
  if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
  const body=await req.json()
  const allowed=['title','description','price_cents','is_published','is_public','slug','thumbnail_url','thumbnail_attribution','intro_description','conclusion_description','editor_tools']
  const updates=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k))) as Database['public']['Tables']['courses']['Update']
  if(updates.price_cents!==undefined&&(!Number.isInteger(updates.price_cents)||updates.price_cents<0))return NextResponse.json({error:'Price must be a nonnegative whole number of cents'},{status:400})
  if(updates.price_cents!==undefined&&updates.price_cents>0)updates.is_public=false
  const {data,error}=await ctx.db.from('courses').update(updates).eq('id',courseId).select('id').single()
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true,id:data.id})
}
