import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';")
 await db.exec(fs.readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8').replace(/create extension if not exists "pgcrypto";/,''))
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows
 const one=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0]
 const admin=await one("insert into users(clerk_id,email,role) values('delete-admin','admin@example.test','admin') returning id")
 const owner=await one("insert into users(clerk_id,email,role) values('delete-owner','owner@example.test','instructor') returning id")
 const course=await one("insert into courses(instructor_id,title,slug) values($1,'First','first') returning id",[owner])
 const other=await one("insert into courses(instructor_id,title,slug) values($1,'Other','other') returning id",[owner])
 const asset=await one("insert into assets(owner_id,title,bucket,object_path) values($1,'Image','images','example/image.png') returning id",[owner])
 await q("insert into course_assets(course_id,asset_id,removed_at) values($1,$2,now()-interval '31 days'),($3,$2,null)",[course,asset,other])
 const begin=(override=false,author=admin)=>one('select begin_asset_deletion($1,$2,$3)',[asset,author,override])
 await assert.rejects(begin(false,owner),/Administrators only/)
 await assert.rejects(begin(),/every course/)
 await q("update course_assets set removed_at=now()-interval '29 days' where course_id=$1",[other])
 await assert.rejects(begin(),/every course/)
 await q("update course_assets set removed_at=now()-interval '31 days' where course_id=$1",[other])
 await q('select set_course_asset_removed($1,$2,$3,false)',[course,asset,owner]);
 await q('select set_course_asset_removed($1,$2,$3,true)',[course,asset,owner]);
 await assert.rejects(begin(),/every course/,'Restoration resets the waiting period');
 await q("update course_assets set removed_at=now()-interval '31 days' where asset_id=$1",[asset]);
 await q("update courses set thumbnail_url='https://example.test/images/example/image.png' where id=$1",[other]);
 await assert.rejects(begin(true),/current content/,'Course thumbnails block deletion');
 await q('update courses set thumbnail_url=null where id=$1',[other]);
 const lesson=await one("insert into lessons(course_id,title) values($1,'Lesson') returning id",[other])
 const content={type:'doc',content:[{type:'image',attrs:{src:'https://example.test/storage/v1/object/public/images/example/image.png',alt:'Sample'}}]}
 const save=async(patch,action)=>q('select save_content($1,$2,$3,$4,$5)',[lesson,owner,await one('select version from course_items where id=$1',[lesson]),patch,action])
 await save({content},'draft')
 await assert.rejects(begin(true),/current content/,'Override cannot delete a draft image')
 // Also detects references in a course with no library membership.
 await q('delete from course_assets where course_id=$1 and asset_id=$2',[other,asset])
 await assert.rejects(begin(true),/current content/)
 await save({content},'publish')
 await assert.rejects(begin(true),/every course/)
 await q('update lessons set is_published=false,archived_at=now() where id=$1',[lesson])
 await q("update course_assets set removed_at=now()-interval '31 days' where asset_id=$1",[asset])
 const review=await one('select asset_deletion_review($1)',[asset])
 assert.equal(review.blocked,false);assert.ok(review.history_count>0);assert.ok(review.uses.some(u=>u.state==='Archived'))
 await assert.rejects(begin(),/older revisions/)
 const job=await begin(true);assert.equal(job.bucket,'images');assert.equal(job.override_history,true)
 assert.equal((await begin()).requested_at,job.requested_at,'Retry uses the existing reservation')
 await assert.rejects(q('select set_course_asset_removed($1,$2,$3,false)',[course,asset,owner]),/permanently deleted/)
 await assert.rejects(q("insert into lessons(course_id,title,content) values($1,'Stale editor',$2)",[course,content]),/permanently deleted/)
 await assert.rejects(q('select finish_asset_deletion($1,$2)',[asset,owner]),/Administrators only/)
 await q('select finish_asset_deletion($1,$2)',[asset,admin])
 assert.equal(await one('select count(*)::int from assets where id=$1',[asset]),0)
 assert.equal(await one('select count(*)::int from course_assets where asset_id=$1',[asset]),0)
 assert.equal(await one('select count(*)::int from item_assets where asset_id=$1',[asset]),0)
 assert.ok(await one('select deleted_at is not null from asset_deletions where asset_id=$1',[asset]))
 assert.ok(await one('select count(*)::int from content_revisions where item_id=$1',[lesson]),'History itself remains')
 await q('select finish_asset_deletion($1,$2)',[asset,admin])
 await assert.rejects(q("insert into assets(owner_id,title,bucket,object_path) values($1,'Again','images','example/image.png')",[owner]),/permanently deleted/)
 for(const signature of ['asset_deletion_review(uuid)','begin_asset_deletion(uuid,uuid,boolean)','finish_asset_deletion(uuid,uuid)'])assert.equal(await one("select has_function_privilege('authenticated',$1,'execute')",[signature]),false)
 console.log('PASS: administrator deletion, all-course waiting period, current-reference protection, history override, reservation/retry, stale saves, cleanup and tombstones')
}finally{await db.close()}

const {default:vm}=await import('node:vm')
const {default:ts}=await import('typescript')
const routeExports={},assetId='22222222-2222-4222-8222-222222222222'
let role='instructor',storageError=false,beginError=null,finishError=null,calls=[]
const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{title:'Image'},error:null})}
const mockDb={from:()=>query,rpc:async(name,args)=>{calls.push(name);assert.equal(args.p_author,'trusted-admin');return {data:{bucket:'images',object_path:'example/image.png'},error:name==='begin_asset_deletion'?beginError:finishError}},storage:{from:bucket=>({remove:async paths=>{assert.equal(bucket,'images');assert.deepEqual(Array.from(paths),['example/image.png']);calls.push('storage');return {error:storageError?{message:'failed'}:null}}})}}
const source=fs.readFileSync(new URL('../src/app/api/admin/asset-deletions/route.ts',import.meta.url),'utf8')
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:routeExports,require:name=>name==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}}:{adminAccess:async()=>({user:{id:'trusted-admin',role},db:mockDb})},URL,Map})
const post=()=>routeExports.POST({json:async()=>({asset_id:assetId,confirmation:'Image',override_history:true,p_author:'forged'})})
assert.equal((await routeExports.GET({url:'https://example.test/api/admin/asset-deletions'})).status,403);
assert.equal((await post()).status,403);assert.equal(calls.length,0)
role='admin';beginError={message:'Still in use',code:'23503'}
assert.equal((await post()).status,409);assert.deepEqual(calls,['begin_asset_deletion'])
beginError=null;calls=[];storageError=true
assert.equal((await post()).status,502);assert.deepEqual(calls,['begin_asset_deletion','storage'])
storageError=false;calls=[];finishError={message:'temporary failure'}
assert.equal((await post()).status,500);assert.deepEqual(calls,['begin_asset_deletion','storage','finish_asset_deletion'])
finishError=null;calls=[];assert.equal((await post()).status,200)
assert.deepEqual(calls,['begin_asset_deletion','storage','finish_asset_deletion'])
console.log('PASS: deletion API enforces administrator role, uses trusted author, reserves before storage and supports storage/cleanup retries')
