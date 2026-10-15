import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
type Context = { params: Promise<{ courseId: string }> }
export async function GET(_req: Request, { params }: Context) {
  const { courseId } = await params
  const ctx = await adminAccess(courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const [course,terms] = await Promise.all([
    ctx.db.from('courses').select('language_code,difficulty,learning_objectives').eq('id',courseId).single(),
    ctx.db.from('course_terms').select('taxonomy_terms(kind,name)').eq('course_id',courseId),
  ])
  if (course.error || terms.error) return NextResponse.json({ error: 'Unable to load classification' }, { status: 500 })
  return NextResponse.json({ ...course.data, terms: terms.data.map(t=>t.taxonomy_terms) })
}
export async function PUT(req: Request, { params }: Context) {
  const { courseId } = await params
  const ctx = await adminAccess(courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { error } = await ctx.db.rpc('save_course_classification', { p_course:courseId,p_author:ctx.user.id,p_language:body.language_code,p_difficulty:body.difficulty,p_objectives:body.learning_objectives,p_terms:body.terms })
  return error ? NextResponse.json({ error:error.message },{ status:400 }) : NextResponse.json({ ok:true })
}
