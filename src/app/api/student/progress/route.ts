import { NextResponse } from 'next/server'
import { learnerAccess } from '@/lib/adminAccess'
import { getLearningProgress } from '@/lib/learningProgress'
export async function GET(){
 const ctx=await learnerAccess()
 if(!ctx)return NextResponse.json({error:'Unauthorized'},{status:401})
 try{return NextResponse.json({courses:await getLearningProgress(ctx.user.id)})}
 catch{return NextResponse.json({error:'Unable to load progress'},{status:500})}
}
