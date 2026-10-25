import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';")
 await db.exec(fs.readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8').replace(/create extension if not exists "pgcrypto";/,''))
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows
 const one=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0]
 const owner=await one("insert into users(clerk_id,email,role) values('usage-owner','owner@example.test','instructor') returning id")
 const other=await one("insert into users(clerk_id,email,role) values('usage-other','other@example.test','instructor') returning id")
 const course=await one("insert into courses(instructor_id,title,slug) values($1,'Usage','usage') returning id",[owner])
 const second=await one("insert into courses(instructor_id,title,slug) values($1,'Other','other') returning id",[other])
 const asset=await one("insert into assets(owner_id,title,external_url) values($1,'Image','https://example.test/image.png') returning id",[owner])
 await q("insert into course_assets(course_id,asset_id,display_name,tags) values($1,$2,'Course name',array['tag']),($3,$2,'Other name',array['other'])",[course,asset,second])
 const usage=()=>one('select course_asset_usage($1,$2)',[course,asset])
 const remove=()=>q('select set_course_asset_removed($1,$2,$3,true)',[course,asset,owner])
 await remove();assert.equal((await usage()).removed,true)
 assert.equal(await one('select removed_at is null from course_assets where course_id=$1',[second]),true)
 assert.equal(await one('select count(*)::int from assets where id=$1',[asset]),1)
 await q('select set_course_asset_removed($1,$2,$3,false)',[course,asset,owner])
 assert.equal((await usage()).removed,false)
 assert.equal(await one('select display_name from course_assets where course_id=$1',[course]),'Course name')
 await assert.rejects(q('select set_course_asset_removed($1,$2,$3,true)',[course,asset,other]),/Forbidden/)
 const lesson=await one("insert into lessons(course_id,title) values($1,'Lesson') returning id",[course])
 const save=async(patch,action)=>q('select save_content($1,$2,$3,$4,$5)',[lesson,owner,await one('select version from course_items where id=$1',[lesson]),patch,action])
 const content={type:'doc',content:[{type:'paragraph'},{type:'image',attrs:{src:'https://example.test/image.png',alt:'Image'}}]}
 await save({content},'draft')
 assert.ok((await usage()).uses.some(row=>row.state==='Draft'&&row.item_id===lesson))
 await assert.rejects(remove(),/still used/)
 await save({content},'publish')
 assert.ok((await usage()).uses.some(row=>row.state==='Published'))
 await save({content:{type:'doc',content:[{type:'paragraph'}]},resources:[]},'draft')
 await assert.rejects(remove(),/still used/,'The published image still needs protection')
 await save({},'publish')
 assert.equal((await usage()).uses.length,0)
 assert.ok((await usage()).history_count>0)
 await remove()
 assert.equal((await usage()).removed,true,'Historical references permit reversible removal')
 await save({resources:[{asset_id:asset,purpose:'download'}]},'publish')
 assert.equal((await usage()).removed,false,'Published reuse restores membership')
 await assert.rejects(remove(),/still used/)
 const questionAsset=await one("insert into assets(owner_id,title,external_url) values($1,'Question image','https://example.test/question.png') returning id",[owner])
 await q('insert into course_assets(course_id,asset_id) values($1,$2)',[course,questionAsset])
 const assessment=await one("insert into assessments(course_id,title,assessment_type) values($1,'Quiz','quiz') returning id",[course])
 await q("insert into assessment_questions(assessment_id,question_type,question_text,explanation_content) values($1,'text_response','Question',$2)",[assessment,{type:'doc',content:[{type:'image',attrs:{src:'https://example.test/question.png'}}]}])
 const questionUsage=await one('select course_asset_usage($1,$2)',[course,questionAsset])
 assert.ok(questionUsage.uses.some(row=>row.item_id===assessment&&row.state==='Saved'))
 await assert.rejects(q('select set_course_asset_removed($1,$2,$3,true)',[course,questionAsset,owner]),/still used/)
 assert.equal(await one("select has_function_privilege('anon','course_asset_usage(uuid,uuid)','execute')"),false)
 assert.equal(await one("select has_function_privilege('authenticated','set_course_asset_removed(uuid,uuid,uuid,boolean)','execute')"),false)
 assert.equal(await one("select has_function_privilege('service_role','set_course_asset_removed(uuid,uuid,uuid,boolean)','execute')"),true)
 console.log('PASS: asset usage across drafts/publication/questions/history, reversible removal, rediscovery, metadata retention and course isolation')
}finally{await db.close()}

const {default:vm}=await import('node:vm')
const {default:ts}=await import('typescript')
const routeExports={}
const allowedCourse='11111111-1111-4111-8111-111111111111',assetId='22222222-2222-4222-8222-222222222222'
let authorized=true,membership=true,rpcError=null,calls=[]
const mockDb={
 from:table=>{const filters={};const query={select:()=>query,eq:(k,v)=>{filters[k]=v;return query},maybeSingle:async()=>{assert.equal(filters.course_id,allowedCourse);assert.equal(filters.asset_id,assetId);return {data:membership?{asset_id:assetId}:null,error:null}},single:async()=>({data:{slug:'test-course'},error:null})};return query},
 rpc:async(name,args)=>{calls.push({name,args});return {data:{uses:[],history_count:0,removed:false},error:rpcError}},
}
const routeSource=fs.readFileSync(new URL('../src/app/api/admin/assets/[assetId]/route.ts',import.meta.url),'utf8')
vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:routeExports,URL,Promise,require:name=>name==='next/server'?{NextResponse:{json:(body,init)=>Response.json(body,init)}}:{adminAccess:async course=>authorized&&course===allowedCourse?{db:mockDb,user:{id:'trusted-author'}}:null}})
const context={params:Promise.resolve({assetId})}
const req=(method='GET',body)=>new Request('http://test/api/admin/assets/'+assetId+'?course_id='+allowedCourse,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
authorized=false;assert.equal((await routeExports.GET(req(),context)).status,403);assert.equal(calls.length,0)
authorized=true;membership=false;assert.equal((await routeExports.PATCH(req('PATCH',{removed:true}),context)).status,404);assert.equal(calls.length,0)
membership=true;assert.equal((await routeExports.PATCH(req('PATCH',{removed:'true'}),context)).status,400)
assert.equal((await routeExports.GET(req(),context)).status,200)
rpcError={code:'23503'};assert.equal((await routeExports.PATCH(req('PATCH',{removed:true,author:'forged'}),context)).status,409)
assert.equal(calls.at(-1).args.p_author,'trusted-author')
rpcError=null;assert.equal((await routeExports.PATCH(req('PATCH',{removed:false}),context)).status,200)
assert.equal(calls.at(-1).args.p_removed,false)
console.log('PASS: real asset routes reject unauthorized/missing membership, validate requests, and preserve server-side removal conflicts')
