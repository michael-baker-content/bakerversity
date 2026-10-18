import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { startAuthoringFixture } from '../tests/fixtures/authoring-server.mjs'
import { authoringSmoke } from '../tests/browser/authoring-smoke.mjs'

const repo=path.resolve(import.meta.dirname,'..')
const root=fs.mkdtempSync(path.join(os.tmpdir(),'bakerversity-smoke-'))
const put=(name,body)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body)}
const fixture=await startAuthoringFixture()
let child,browser,logs=''
try {
 fs.symlinkSync(path.join(repo,'node_modules'),path.join(root,'node_modules'),process.platform==='win32'?'junction':'dir')
 for(const dir of ['components','lib'])fs.cpSync(path.join(repo,'src',dir),path.join(root,'src',dir),{recursive:true})
 for(const kind of ['lessons','pages','assessments'])for(const part of ['new',`[${kind==='lessons'?'lessonId':kind==='pages'?'pageId':'assessmentId'}]`]){
  const file=`src/app/admin/courses/[slug]/${kind}/${part}/page.tsx`;put(file,fs.readFileSync(path.join(repo,file),'utf8'))
 }
 put('package.json','{"private":true}')
 put('tsconfig.json',fs.readFileSync(path.join(repo,'tsconfig.json'),'utf8'))
 put('next.config.mjs',"export default {transpilePackages:['mafs'],devIndicators:false}")
 put('src/app/layout.tsx',`import Refresh from '@/components/RefreshCourseOverview';export default function Layout({children}:{children:React.ReactNode}){return <html><body><aside>ISOLATED AUTHORING SMOKE TEST</aside><Refresh/>{children}</body></html>}`)
 put('src/app/admin/courses/[slug]/page.tsx',`import Link from 'next/link';export const dynamic='force-dynamic';export default async function Page(){const rows=await(await fetch('${fixture.origin}/api/fixture/overview',{cache:'no-store'})).json();return <main><h1>Smoke course</h1><Link href='/admin/courses/smoke/lessons/new'>New lesson</Link><Link href='/admin/courses/smoke/assessments/new'>New assessment</Link><Link href='/admin/courses/smoke/pages/new'>New page</Link>{rows.map((r:{id:string;kind:string;title:string;is_published:boolean})=><div key={r.id}><Link href={'/admin/courses/smoke/'+({lesson:'lessons',assessment:'assessments',page:'pages'}[r.kind])+'/'+r.id}>{r.title}</Link> {r.is_published?'Published':'Draft'}</div>)}</main>}`)
 put('src/app/student/[id]/page.tsx',`import Taker from '@/components/AssessmentTaker';export const dynamic='force-dynamic';export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const result=await fetch('${fixture.origin}/api/fixture/student/'+id,{cache:'no-store'});if(!result.ok)return <p>Not published</p>;const {assessment:a,questions}=await result.json();return <Taker assessmentId={a.id} title={a.title} assessmentType={a.assessment_type} isGraded={a.is_graded} passingScore={a.passing_score} introContent={a.intro_content} questions={questions}/>}`)
 put('src/app/api/[...path]/route.ts',`async function proxy(req:Request){const url=new URL(req.url);const response=await fetch('${fixture.origin}'+url.pathname+url.search,{method:req.method,headers:{'Content-Type':'application/json'},body:['GET','HEAD'].includes(req.method)?undefined:await req.text(),cache:'no-store'});return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}})}export {proxy as GET,proxy as POST,proxy as PATCH,proxy as DELETE}`)
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve))
 const origin=`http://127.0.0.1:${port}`
 child=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','-H','127.0.0.1','-p',String(port)],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}})
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{logs=(logs+data).slice(-14000)})
 let ready=false
 for(let i=0;i<90;i++){try{if((await fetch(origin+'/admin/courses/smoke',{signal:AbortSignal.timeout(10000)})).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,500))}
 if(!ready)throw new Error('Smoke server failed to start')
 browser=await chromium.launch({headless:true,...(process.env.SMOKE_BROWSER_CHANNEL?{channel:process.env.SMOKE_BROWSER_CHANNEL}:{})})
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(20000)
 await authoringSmoke(page,origin,fixture.origin)
 console.log('PASS: authoring browser smoke test')
} catch(error){console.error(logs);throw error}
finally {await browser?.close();if(child?.pid){if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGTERM')}await fixture.close()}
