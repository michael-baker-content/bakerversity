import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import { canEditCourse } from '@/lib/accessPolicy.mjs'
import { NextResponse } from 'next/server'

// POST — toggle enrollment in own course
// Body: { courseId: string }
export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await authorAccessFor(clerkUser.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const {db:supabase,user}=access

  const { courseId } = await req.json()

  // Author preview enrollment is separate from ordinary learner enrollment.
  const { data: course } = await supabase
    .from('courses').select('id, instructor_id').eq('id', courseId).single()

  if (!canEditCourse(user,course)) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Check existing enrollment
  const { data: existing } = await supabase
    .from('enrollments').select('id')
    .eq('user_id', user.id).eq('course_id', courseId).single()

  if (existing) {
    // Unenroll
    await supabase.from('enrollments').delete()
      .eq('user_id', user.id).eq('course_id', courseId)
    return NextResponse.json({ enrolled: false })
  } else {
    // Enroll
    await supabase.from('enrollments').insert({
      user_id: user.id,
      course_id: courseId,
    })
    return NextResponse.json({ enrolled: true })
  }
}
