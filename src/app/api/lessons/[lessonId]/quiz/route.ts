import { NextResponse } from 'next/server'
const retired = () => NextResponse.json({ error: 'Legacy quizzes have been retired. Use course assessments.' }, { status: 410 })
export const GET = retired
export const POST = retired
