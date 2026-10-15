import { readContent, writeContent, archiveContent } from '@/lib/contentRoutes'
type Context = { params: Promise<{ courseId: string; assessmentId: string }> }
export async function GET(_req: Request, { params }: Context) { const p = await params; return readContent(p.courseId, p.assessmentId, 'assessments') }
export async function PATCH(req: Request, { params }: Context) { const p = await params; return writeContent(req, p.courseId, p.assessmentId, 'assessments') }
export async function DELETE(_req: Request, { params }: Context) { const p = await params; return archiveContent(p.courseId, p.assessmentId, 'assessments') }
