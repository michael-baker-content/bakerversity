import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST — toggle enrollment in own course
// Body: { courseId: string }
export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { courseId } = await req.json()

  // Verify they own the course
  const { data: course } = await supabase
    .from('courses').select('id, title').eq('id', courseId).eq('instructor_id', user.id).single()

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

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
