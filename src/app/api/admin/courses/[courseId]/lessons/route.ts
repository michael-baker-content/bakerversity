import { textImageError } from '@/lib/textImage.mjs'
import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('instructor_id', user.id)
    .single()

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const { title, content, module_id, introduction } = await req.json()

  const componentError=textImageError(content)
  if(componentError)return NextResponse.json({error:componentError},{status:400})
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  // Generate a unique slug within this course
  const baseSlug = toSlug(title)
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('slug', slug)
      .single()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      course_id: courseId,
      module_id: module_id ?? null,
      title,
      slug,
      introduction: introduction ?? null,
      content: content ?? null,
      position: count ?? 0,
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 })
}
