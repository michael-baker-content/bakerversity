import { NextResponse } from 'next/server'
import { learnerAccess } from '@/lib/adminAccess'
export async function POST(req: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const ctx = await learnerAccess()
  if (!ctx) return NextResponse.json({ error: 'Sign in to submit an assessment' }, { status: 401 })
  const { assessmentId } = await params
  const body = await req.json()
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  const { data, error } = await ctx.db.rpc('submit_assessment', { p_user: ctx.user.id, p_assessment: assessmentId, p_answers: body.answers, p_request: body.request_id ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 400 })
  return NextResponse.json(data)
}
