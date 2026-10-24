import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import { canEditCourse } from '@/lib/accessPolicy.mjs'
import { NextResponse } from 'next/server'

// GET /api/admin/course-id-by-slug?slug=intro-to-algebra
export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const access = await authorAccessFor(clerkUser.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const {db:supabase,user}=access

  const { data: course } = await supabase
    .from('courses')
    .select('id, instructor_id')
    .eq('slug', slug)
    .single()

  if (!canEditCourse(user,course)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ id: course!.id })
}
