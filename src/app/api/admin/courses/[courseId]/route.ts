import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: user } = await supabase.from('users').select('id, role').eq('clerk_id', clerkUser.id).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_published, is_public, price_cents, thumbnail_url, thumbnail_attribution, intro_description, conclusion_description, editor_tools')
    .eq('id', courseId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
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

  const body = await req.json()

  const allowed = [
    'title', 'description', 'price_cents', 'is_published', 'is_public',
    'slug', 'thumbnail_url', 'thumbnail_attribution', 'intro_description',
    'conclusion_description', 'editor_tools',
  ]
  const updates = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )

  // is_public only makes sense on free courses — enforce at API level
  if (updates.is_public === true) {
    const { data: course } = await supabase
      .from('courses').select('price_cents').eq('id', courseId).single()
    if (course && course.price_cents > 0) {
      return NextResponse.json({ error: 'Only free courses can be made public' }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .eq('instructor_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
