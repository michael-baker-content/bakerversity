import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import { NextResponse } from 'next/server'


// GET — list modules for a course
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorAccessFor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await ctx.db
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  return NextResponse.json(data ?? [])
}

// POST — create a module
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorAccessFor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  // Get next position
  const { count } = await ctx.db
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { data, error } = await ctx.db
    .from('modules')
    .insert({
      course_id: courseId,
      title: title.trim(),
      description: description ?? null,
      position: count ?? 0,
      slug: String((count ?? 0) + 1),
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
