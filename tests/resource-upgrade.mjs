import fs from 'node:fs'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite')

export async function testResourceUpgrade() {
  const db = new PGlite()
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';")
  await db.exec(fs.readFileSync(new URL('../supabase/baseline.sql', import.meta.url), 'utf8').replace(/create extension if not exists "pgcrypto";/, ''))
  for (const file of fs.readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort().filter(f => f.startsWith('20261014'))) {
    await db.exec(fs.readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  }
  const q = async (sql, args=[]) => (await db.query(sql,args)).rows
  const scalar = async (sql,args=[]) => Object.values((await q(sql,args))[0])[0]
  const user = await scalar("insert into users(clerk_id,email,role) values('upgrade-author','upgrade@example.test','instructor') returning id")
  const course = await scalar("insert into courses(instructor_id,title,slug) values($1,'Upgrade','upgrade') returning id", [user])
  const item = await scalar("insert into lessons(course_id,title,slug,is_published) values($1,'Existing','existing',true) returning id", [course])
  const asset = await scalar("insert into assets(owner_id,title,bucket,object_path) values($1,'Existing resource','lesson-slides','existing.zip') returning id", [user])
  await q('insert into item_assets(item_id,asset_id) values($1,$2)',[item,asset])
  await q("select save_content($1,$2,1,'{}','draft')",[item,user])
  const migration = fs.readFileSync(new URL('../supabase/migrations/202610150001_revision_resources.sql',import.meta.url),'utf8')
  await assert.rejects(db.exec(migration),/needs review/)
  await db.exec('rollback')
  assert.equal(await scalar("select count(*)::int from information_schema.columns where table_schema='public' and table_name='item_assets' and column_name='source'"),0)
  assert.equal(await scalar('select count(*)::int from item_assets'),1)
  assert.equal(await scalar('select count(*)::int from content_drafts'),1)
  // Fixture-only resolution: explicitly publish the reviewed existing draft using the old contract.
  await q("select save_content($1,$2,2,'{}','publish')",[item,user])
  const accountBefore = await q('select * from users')
  const historyBefore = await q('select * from content_revisions order by version')
  await db.exec(migration)
  assert.deepEqual(await q('select * from users'),accountBefore)
  assert.deepEqual(await q('select * from content_revisions order by version'),historyBefore,'Migration does not invent historical attachment selections')
  assert.deepEqual(await q('select asset_id,source from item_assets'),[{asset_id:asset,source:'attached'}])
  await q("select save_content($1,$2,3,'{}','draft')",[item,user])
  assert.deepEqual(await scalar("select snapshot->'resources' from content_drafts where item_id=$1",[item]),[{asset_id:asset,purpose:'download'}])
  await db.close()
  console.log('PASS: migration stops on ambiguous legacy drafts, rolls back safely, preserves existing links, history and accounts')
}
