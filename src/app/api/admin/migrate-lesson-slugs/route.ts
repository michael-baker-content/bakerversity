import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { canManageSite } from '@/lib/accessPolicy.mjs'
import { NextResponse } from 'next/server'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// POST /api/admin/migrate-lesson-slugs
// Generates slugs for all lessons that don't have one.
// Safe to run multiple times — skips lessons that already have slugs.
export async function POST() {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!canManageSite(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all lessons without slugs
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, course_id, slug')
    .is('slug', null)

  if (!lessons?.length) {
    return NextResponse.json({ message: 'No lessons need slugs', updated: 0 })
  }

  let updated = 0
  const errors: string[] = []

  for (const lesson of lessons) {
    const baseSlug = toSlug(lesson.title || 'lesson')
    let slug = baseSlug
    let attempt = 0

    // Find a unique slug within this course
    while (true) {
      const { data: existing } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', lesson.course_id)
        .eq('slug', slug)
        .single()

      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const { error } = await supabase
      .from('lessons')
      .update({ slug })
      .eq('id', lesson.id)

    if (error) {
      errors.push(`${lesson.id}: ${error.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    message: `Updated ${updated} lessons`,
    updated,
    errors: errors.length ? errors : undefined,
  })
}
