import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function verifyInstructor(clerkId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null
  return { user, supabase }
}

// PATCH — rename or reposition a module
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  const { moduleId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['title', 'description', 'position']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  const { error } = await ctx.supabase
    .from('modules').update(updates).eq('id', moduleId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a module (lessons become unassigned)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  const { moduleId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Unassign lessons from this module before deleting
  await ctx.supabase
    .from('lessons').update({ module_id: null }).eq('module_id', moduleId)

  const { error } = await ctx.supabase
    .from('modules').delete().eq('id', moduleId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
