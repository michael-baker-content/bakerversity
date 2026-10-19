import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
try {
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';")
await db.exec(fs.readFileSync(new URL('../supabase/baseline.sql',import.meta.url),'utf8').replace(/create extension if not exists "pgcrypto";/,''))
const dir=new URL('../supabase/migrations/',import.meta.url),files=fs.readdirSync(dir).sort(),migration='202610190001_course_assets.sql'
for(const f of files.filter(f=>f<migration))await db.exec(fs.readFileSync(new URL(f,dir),'utf8'))
const q=async(sql,args=[]) => (await db.query(sql,args)).rows
const one=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0]
const owner=await one("insert into users(clerk_id,email,role) values('dam','dam@example.test','instructor') returning id")
const course=await one("insert into courses(instructor_id,title,slug) values($1,'DAM','dam') returning id",[owner])
const lesson=await one("insert into lessons(course_id,title) values($1,'Lesson') returning id",[course])
const asset=await one("insert into assets(owner_id,title,alt_text,external_url) values($1,'Image','Original','https://example.test/image.png') returning id",[owner])
await q("select save_content($1,$2,1,$3,'publish')",[lesson,owner,{resources:[{asset_id:asset,purpose:'download'}]}])
const draftAsset=await one("insert into assets(owner_id,title,external_url) values($1,'Draft image','https://example.test/draft.png') returning id",[owner])
await q("select save_content($1,$2,2,$3,'draft')",[lesson,owner,{content:{type:'doc',content:[{type:'image',attrs:{src:'https://example.test/draft.png'}}]}}])
await db.exec(fs.readFileSync(new URL(migration,dir),'utf8'))
assert.equal(await one('select count(*)::int from course_assets'),2,'Backfill published and draft assets')
assert.equal(await one('select default_alt_text from course_assets where asset_id=$1',[asset]),'Original')
await q("update course_assets set default_caption='Caption',default_alt_text='' where asset_id=$1",[asset])
await q("select save_content($1,$2,3,$3,'publish')",[lesson,owner,{resources:[{asset_id:asset,purpose:'download'}]}])
assert.equal(await one('select default_caption from course_assets where asset_id=$1',[asset]),'Caption','Rediscovery preserves defaults')
assert.equal(await one('select alt_text from assets where id=$1',[asset]),'Original','Defaults do not rewrite source metadata')
assert.equal(await one("select has_table_privilege('authenticated','course_assets','SELECT')"),false)
assert.equal(await one("select has_table_privilege('anon','course_assets','UPDATE')"),false)
assert.equal(await one("select has_table_privilege('service_role','course_assets','INSERT')"),true)
await assert.rejects(q('delete from assets where id=$1',[draftAsset]))
console.log('PASS: course library backfill, draft discovery, default preservation, restricted privileges and referenced-file protection')
} finally {await db.close()}
