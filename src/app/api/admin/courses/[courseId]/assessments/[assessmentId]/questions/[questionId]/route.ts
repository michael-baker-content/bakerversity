import { questionRequest } from '@/lib/questionRoutes'
type Context = { params: Promise<{courseId:string;assessmentId:string;questionId:string}> }
export async function PATCH(req:Request,{params}:Context) {const p=await params;return questionRequest(req,p.courseId,p.assessmentId,p.questionId)}
export async function DELETE(req:Request,{params}:Context) {const p=await params;return questionRequest(req,p.courseId,p.assessmentId,p.questionId)}
