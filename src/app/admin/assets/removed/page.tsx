import {redirect} from 'next/navigation'
import Link from 'next/link'
import {adminAccess} from '@/lib/adminAccess'
import PermanentAssetQueue from '@/components/PermanentAssetQueue'
export default async function RemovedAssetsPage(){
 const ctx=await adminAccess()
 if(!ctx||ctx.user.role!=='admin')redirect('/dashboard')
 return <main className="page" style={{maxWidth:900}}><Link href="/admin/courses">← Courses</Link><h1>Removed assets</h1><PermanentAssetQueue/></main>
}
