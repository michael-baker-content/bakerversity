import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import { NextResponse } from 'next/server'

// GET /api/admin/lesson-id-by-slug?courseId=xxx&slug=solving-linear-equations
export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const slug = searchParams.get('slug')

  if (!courseId || !slug) {
    return NextResponse.json({ error: 'courseId and slug required' }, { status: 400 })
  }

  const access = await authorAccessFor(clerkUser.id, courseId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const {db:supabase,user}=access

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('slug', slug)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ id: lesson.id })
}
