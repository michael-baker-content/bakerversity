import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { resolveAuthorAccess } from './accessPolicy.mjs'

// The caller supplies a server-authenticated Clerk ID, never a request-body ID.
export async function authorAccessFor(clerkId:string,courseId?:string){
 const db=createServiceClient()
 const user=await resolveAuthorAccess(db,clerkId,courseId)
 return user ? {db,user:user as {id:string;role:string}} : null
}
export async function adminAccess(courseId?:string){
 const clerk=await currentUser()
 return clerk ? authorAccessFor(clerk.id,courseId) : null
}

export async function learnerAccess() {
  const clerk = await currentUser()
  if (!clerk) return null
  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id').eq('clerk_id', clerk.id).single()
  return user ? { db, user } : null
}
