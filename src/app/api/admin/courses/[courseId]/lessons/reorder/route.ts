import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
export async function POST(req:Request,{params}:{params:Promise<{courseId:string}>}) {
 const {courseId}=await params; const ctx=await adminAccess(courseId)
 if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403})
 const body=await req.json()
 if(!Array.isArray(body.lessons))return NextResponse.json({error:'Invalid sequence'},{status:400})
 const {error}=await ctx.db.rpc('reorder_course_items',{p_course:courseId,p_author:ctx.user.id,p_items:body.lessons})
 return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
