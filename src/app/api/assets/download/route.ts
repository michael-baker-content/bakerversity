import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { handleAssetDownload } from '@/lib/assetDownload'
export const dynamic='force-dynamic'
export async function GET(req:Request) {
  const db=createServiceClient(),clerk=await currentUser()
  const {data:user}=clerk?await db.from('users').select('id,role').eq('clerk_id',clerk.id).maybeSingle():{data:null}
  return handleAssetDownload(req,db,user)
}
