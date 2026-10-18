import { questionRequest } from '@/lib/questionRoutes'
type Context = { params: Promise<{courseId:string;assessmentId:string}> }
export async function GET(req:Request,{params}:Context) {const p=await params;return questionRequest(req,p.courseId,p.assessmentId)}
export async function POST(req:Request,{params}:Context) {const p=await params;return questionRequest(req,p.courseId,p.assessmentId)}
