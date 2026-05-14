import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const PAGE_TYPES = ['overview', 'syllabus', 'introduction', 'conclusion', 'resources', 'requirements', 'custom'] as const

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

async function verifyInstructor(clerkId: string, courseId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase.from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null
  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()
  if (!course) return null
  return { user, supabase }
}

// GET — list pages for a course
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await ctx.supabase
    .from('course_pages')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  return NextResponse.json(data ?? [])
}

// POST — create a page
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, page_type, content, introduction, module_id } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!PAGE_TYPES.includes(page_type)) return NextResponse.json({ error: 'Invalid page_type' }, { status: 400 })

  // Generate unique slug
  const baseSlug = toSlug(title)
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await ctx.supabase
      .from('course_pages').select('id').eq('course_id', courseId).eq('slug', slug).single()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Get next position
  const { count } = await ctx.supabase
    .from('course_pages').select('*', { count: 'exact', head: true }).eq('course_id', courseId)

  const { data, error } = await ctx.supabase
    .from('course_pages')
    .insert({
      course_id: courseId,
      page_type,
      title: title.trim(),
      slug,
      content: content ?? null,
      introduction: introduction ?? null,
      module_id: module_id ?? null,
      position: count ?? 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
