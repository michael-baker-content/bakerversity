import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import type { Database } from '@/lib/database.types'
type Context = { params: Promise<{courseId:string;moduleId:string}> }
export async function PATCH(req:Request,{params}:Context){
 const {courseId,moduleId}=await params;const ctx=await adminAccess(courseId)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 const body=await req.json()
 const updates=Object.fromEntries(Object.entries(body).filter(([k])=>['title','description','position'].includes(k))) as Database['public']['Tables']['modules']['Update']
 const {error}=await ctx.db.from('modules').update(updates).eq('id',moduleId).eq('course_id',courseId)
 return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
export async function DELETE(_req:Request,{params}:Context){
 const {courseId,moduleId}=await params;const ctx=await adminAccess(courseId)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 const {error}=await ctx.db.from('modules').delete().eq('id',moduleId).eq('course_id',courseId)
 return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
