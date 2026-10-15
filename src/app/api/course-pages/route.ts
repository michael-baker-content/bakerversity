import { NextResponse } from 'next/server'
import { learnerAccess } from '@/lib/adminAccess'
export async function GET(req: Request) {
  const ctx = await learnerAccess()
  if (!ctx) return NextResponse.json({ read: [] })
  const courseId = new URL(req.url).searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ read: [] })
  const { data, error } = await ctx.db.from('course_page_views').select('course_page_id, course_pages!inner(course_id)').eq('user_id', ctx.user.id).eq('course_pages.course_id', courseId)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ read: (data ?? []).map(x => x.course_page_id) })
}
export async function POST(req: Request) {
  const ctx = await learnerAccess()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { pageId, read } = await req.json()
  const { data: item } = await ctx.db.from('course_items').select('kind').eq('id', pageId).single()
  if (item?.kind !== 'page') return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  const { data: existing, error: lookupError } = await ctx.db.from('course_page_views').select('id').eq('user_id', ctx.user.id).eq('course_page_id', pageId).maybeSingle()
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  const value = typeof read === 'boolean' ? read : !existing
  const { error } = await ctx.db.rpc('set_item_completion', { p_user: ctx.user.id, p_item: pageId, p_complete: value })
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ read: value })
}
