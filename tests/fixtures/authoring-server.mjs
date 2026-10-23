import { filterCourseAssets } from '../../src/lib/assetSearch.mjs'
// Isolated fixture: real migrations/procedures; no Supabase, Clerk, or live credentials.
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import http from 'node:http'
import { normaliseQuestion } from '../../src/lib/authoring/questions.ts'
export async function startAuthoringFixture() {
 const db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';`)
 await db.exec(fs.readFileSync(new URL('../../supabase/baseline.sql',import.meta.url),'utf8').replace(/create extension if not exists "pgcrypto";/,''))
 for(const file of fs.readdirSync(new URL('../../supabase/migrations/',import.meta.url)).sort())await db.exec(fs.readFileSync(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'))
 const rows=async(sql,args=[]) => (await db.query(sql,args)).rows
 const scalar=async(sql,args=[]) => Object.values((await rows(sql,args))[0])[0]
 const author=await scalar(`insert into users(clerk_id,email,role) values('fixture_author','author@example.test','instructor') returning id`)
 const student=await scalar(`insert into users(clerk_id,email) values('fixture_student','student@example.test') returning id`)
 const course=await scalar(`insert into courses(instructor_id,title,slug,is_published,is_public) values($1,'Smoke course','smoke',true,true) returning id`,[author])
const files=[{id:'fixture-image',title:'Library diagram',original_filename:'diagram.png',created_at:'2026-10-19',url:'https://example.test/diagram.png',mime_type:'image/png',alt_text:'Default diagram description',caption:'Default diagram caption',byte_size:100,item_assets:[]},{id:'fixture-pdf',title:'Slides',original_filename:'slides.pdf',created_at:'2026-10-18',url:'https://example.test/slides.pdf',mime_type:'application/octet-stream',alt_text:null,caption:null,byte_size:200,item_assets:[]}]
 let mode='normal'
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json')
  const reply=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data))}
  try {
   let input='';for await(const chunk of req)input+=chunk
   const body=input?JSON.parse(input):{},url=new URL(req.url,'http://fixture'),path=url.pathname
   if(path==='/api/fixture/mode'){mode=body.mode;return reply({ok:true})}
   if(path==='/api/fixture/overview')return reply(await rows(`select id,kind,title,(status='published') as is_published from course_items where course_id=$1 and status<>'archived' order by created_at,id`,[course]))
   if(path.startsWith('/api/fixture/student/')){const id=path.split('/').pop();const assessment=(await rows('select * from assessments where id=$1 and is_published',[id]))[0];return assessment?reply({assessment,questions:await rows('select id,question_type,question_text,content,options,position from assessment_questions where assessment_id=$1 order by position,id',[id])}):reply({error:'Not published'},404)}
   if(path==='/api/fixture/attempts')return reply(await rows('select * from assessment_attempts'))
   if(path.includes('course-id-by-slug'))return reply({id:course})
   if(path==='/api/admin/assets'){
    if(req.method==='PATCH'){
      const asset=files.find(row=>row.id===body.id)
      if(!asset)return reply({error:'Not found'},404)
      if(body.display_name)asset.title=body.display_name.trim()
      if(body.alt_text!==undefined)asset.alt_text=body.alt_text;if(body.caption!==undefined)asset.caption=body.caption
      if(body.tags!==undefined)asset.tags=body.tags
      return reply({ok:true})
    }

    const matches=filterCourseAssets(files,{q:url.searchParams.get('q')??'',type:url.searchParams.get('type')??'all',sort:url.searchParams.get('sort')??'newest'})
    return reply(url.searchParams.get('summary')==='1'?{items:matches,total:matches.length,courseTotal:files.length}:matches)
   }
   if(path.endsWith('/modules'))return reply([])
   if(path===`/api/admin/courses/${course}`)return reply({editor_tools:['footnotes','math','code','graph','terminal','lang-select','python-lint']})
   if(path.endsWith('/history'))return reply(await rows('select id,version,created_at,snapshot from content_revisions where item_id=$1 order by version desc',[path.split('/').at(-2)]))
   if(path.includes('/api/students/'))return reply(await scalar('select submit_assessment($1,$2,$3,$4)',[student,path.split('/').at(-2),body.answers,body.request_id]))
   const match=path.match(/^\/api\/admin\/courses\/[^/]+\/(lessons|pages|assessments)(?:\/([^/]+))?(?:\/questions(?:\/([^/]+))?)?$/)
   if(!match)return reply({error:'Unknown fixture route'},404)
   const [,kind,id,questionId]=match,table={lessons:'lessons',pages:'course_pages',assessments:'assessments'}[kind],itemKind={lessons:'lesson',pages:'page',assessments:'assessment'}[kind]
   if(path.includes('/questions')){
    if(req.method==='GET')return reply(await rows('select * from assessment_questions where assessment_id=$1 order by position,id',[id]))
    if(req.method==='DELETE'){await rows('delete from assessment_questions where id=$1 and assessment_id=$2',[questionId,id]);return reply({ok:true})}
    const existing=questionId?(await rows('select * from assessment_questions where id=$1',[questionId]))[0]:{}
    const values=normaliseQuestion({...existing,...body})
    const fields=Object.keys(values),args=Object.values(values)
    if(questionId){await rows(`update assessment_questions set ${fields.map((f,i)=>f+'=$'+(i+1)).join(',')} where id=$${args.length+1}`, [...args,questionId]);return reply({ok:true})}
    return reply({id:await scalar(`insert into assessment_questions(${fields.join(',')},assessment_id,position) values(${args.map((_,i)=>'$'+(i+1)).join(',')},$${args.length+1},(select coalesce(max(position),-1)+1 from assessment_questions where assessment_id=$${args.length+1})) returning id`,[...args,id])},201)
   }
   if(req.method==='GET')return reply(await scalar('select get_authoring_content($1,$2,$3)',[id,author,itemKind]))
   if(req.method==='POST'){
    const allowed=kind==='lessons'?['title','content','module_id']:kind==='pages'?['title','content','introduction','page_type','module_id']:['title','assessment_type','is_graded','passing_score','module_id']
    const entries=Object.entries(body).filter(([key])=>allowed.includes(key));const fields=entries.map(([k])=>k),args=entries.map(([,v])=>v)
    return reply({id:await scalar(`insert into ${table}(course_id,${fields.join(',')}) values($1,${args.map((_,i)=>'$'+(i+2)).join(',')}) returning id`,[course,...args])},201)
   }
   if(req.method==='PATCH'){
    if(mode==='validation')return reply({error:'Simulated validation failure'},400)
    if(mode==='conflict')return reply({error:'Version conflict'},409)
    const {version,action,...patch}=body
    const result=await scalar('select save_content($1,$2,$3,$4,$5)',[id,author,version,patch,action])
    if(mode==='commit-lost')return reply({error:'Simulated lost response after commit'},503)
    return reply(result)
   }
   return reply({error:'Unsupported fixture request'},400)
  }catch(error){reply({error:error.message},error.code==='40001'?409:400)}
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 return {origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close()}}
}
