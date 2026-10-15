import { NextResponse } from 'next/server'
import { learnerAccess } from '@/lib/adminAccess'
async function complete(req: Request, value: boolean) {
  const ctx = await learnerAccess()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { lesson_id } = await req.json()
  const { data: item } = await ctx.db.from('course_items').select('kind').eq('id', lesson_id).single()
  if (item?.kind !== 'lesson') return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  const { error } = await ctx.db.rpc('set_item_completion', { p_user: ctx.user.id, p_item: lesson_id, p_complete: value })
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}
export async function POST(req: Request) { return complete(req, true) }
export async function DELETE(req: Request) { return complete(req, false) }
