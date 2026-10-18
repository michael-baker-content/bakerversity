import { adminAccess } from '@/lib/adminAccess'
import { normaliseQuestion } from '@/lib/authoring/questions'
import type { Database } from '@/lib/database.types'

type QuestionWrite = Database['public']['Tables']['assessment_questions']['Insert']
export async function questionRequest(req: Request, courseId: string, assessmentId: string, questionId?: string) {
  const ctx = await adminAccess(courseId)
  if (!ctx) return Response.json({error:'Instructor access required.'},{status:403})
  const {data:assessment,error:readError} = await ctx.db.from('assessments').select('id,is_published,archived_at').eq('course_id',courseId).eq('id',assessmentId).single()
  if (readError || !assessment || assessment.archived_at) return Response.json({error:'Assessment not found.'},{status:404})
  if (req.method === 'GET') {
    const {data,error} = await ctx.db.from('assessment_questions').select('*').eq('assessment_id',assessmentId).order('position').order('id')
    return error ? Response.json({error:'Unable to load questions.'},{status:502}) : Response.json(data)
  }
  if (assessment.is_published) return Response.json({error:'Unpublish this assessment before changing its questions.'},{status:409})
  let existing: Record<string, unknown> = {}
  if (questionId) {
    const {data} = await ctx.db.from('assessment_questions').select('*').eq('assessment_id',assessmentId).eq('id',questionId).single()
    if (!data) return Response.json({error:'Question not found.'},{status:404})
    existing = data
  }
  if (req.method === 'DELETE') {
    const {error} = await ctx.db.from('assessment_questions').delete().eq('assessment_id',assessmentId).eq('id',questionId!)
    return error ? Response.json({error:'Unable to delete this question.'},{status:400}) : Response.json({ok:true})
  }
  const body = await req.json().catch(()=>null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({error:'Invalid question request.'},{status:400})
  let values
  try { values = normaliseQuestion({...existing,...body}) }
  catch(error) {return Response.json({error:(error as Error).message},{status:400})}
  if (questionId) {
    const {error} = await ctx.db.from('assessment_questions').update(values as QuestionWrite).eq('id',questionId).eq('assessment_id',assessmentId)
    return error ? Response.json({error:error.message},{status:400}) : Response.json({ok:true})
  }
  const {data:last,error:positionError} = await ctx.db.from('assessment_questions').select('position').eq('assessment_id',assessmentId).order('position',{ascending:false}).limit(1)
  if (positionError) return Response.json({error:'Unable to determine question order.'},{status:502})
  const {data,error} = await ctx.db.from('assessment_questions').insert({...values,assessment_id:assessmentId,position:(last?.[0]?.position ?? -1)+1} as QuestionWrite).select('id').single()
  return error ? Response.json({error:error.message},{status:400}) : Response.json({id:data!.id},{status:201})
}
