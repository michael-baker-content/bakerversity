import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'

export async function adminAccess(courseId?: string) {
  const clerk = await currentUser()
  if (!clerk) return null
  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id, role').eq('clerk_id', clerk.id).single()
  if (!user || !['instructor', 'admin'].includes(user.role)) return null
  if (courseId) {
    const { data: course } = await db.from('courses').select('instructor_id').eq('id', courseId).single()
    if (!course || (user.role !== 'admin' && course.instructor_id !== user.id)) return null
  }
  return { db, user }
}

export async function learnerAccess() {
  const clerk = await currentUser()
  if (!clerk) return null
  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id').eq('clerk_id', clerk.id).single()
  return user ? { db, user } : null
}
