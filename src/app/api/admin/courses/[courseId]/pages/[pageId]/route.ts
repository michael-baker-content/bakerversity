import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function verifyInstructor(clerkId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase.from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null
  return { user, supabase }
}

// GET — single page
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; pageId: string }> }
) {
  const { pageId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('course_pages').select('*').eq('id', pageId).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH — update a page
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; pageId: string }> }
) {
  const { pageId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['title', 'slug', 'page_type', 'content', 'introduction', 'is_published', 'position', 'module_id']
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { error } = await ctx.supabase.from('course_pages').update(updates).eq('id', pageId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; pageId: string }> }
) {
  const { pageId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await ctx.supabase.from('course_pages').delete().eq('id', pageId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
