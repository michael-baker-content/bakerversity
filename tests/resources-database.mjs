import assert from 'node:assert/strict'
import fs from 'node:fs'

export async function testResourceRevisions(db, { author, student, course }) {
  const q = async (sql, args = []) => (await db.query(sql, args)).rows
  const scalar = async (sql, args = []) => Object.values((await q(sql, args))[0])[0]
  const item = await scalar(`insert into lessons(course_id,title,slug,is_published,content) values($1,'Resource fixture','resource-fixture',true,'{"type":"doc"}') returning id`, [course])
  const download = await scalar(`insert into assets(owner_id,title,bucket,object_path,mime_type) values($1,'Starter','lesson-slides','starter.zip','application/octet-stream') returning id`, [author])
  const image = await scalar(`insert into assets(owner_id,title,bucket,object_path,mime_type) values($1,'Image','lesson-images','figure.png','image/png') returning id`, [author])
  const foreign = await scalar(`insert into assets(owner_id,title,bucket,object_path) values($1,'Other owner','lesson-slides','private.zip') returning id`, [student])
  const selection = [{ asset_id: download, purpose: 'starter' }]
  const doc = { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://fixture.supabase.co/storage/v1/object/public/lesson-images/figure.png' } }] }
  const currentVersion = () => scalar('select version from course_items where id=$1', [item])
  const links = () => q('select asset_id,purpose,source from item_assets where item_id=$1 order by asset_id,purpose', [item])
  const save = async (patch, action = 'draft', version) => scalar('select save_content($1,$2,$3,$4,$5)', [item, author, version ?? await currentVersion(), patch, action])
  await assert.rejects(q('insert into item_assets(item_id,asset_id) values($1,$2)', [item, download]), /Resources must be saved/)
  const version = await currentVersion()
  await save({ resources: selection, content: doc })
  assert.deepEqual(await links(), [], 'Draft cannot expose explicit or embedded files')
  assert.deepEqual(await scalar('select content from lessons where id=$1', [item]), { type: 'doc' })
  assert.deepEqual(await scalar("select snapshot->'resources' from content_drafts where item_id=$1", [item]), selection)
  const loaded = await scalar("select get_authoring_content($1,$2,'lesson')", [item,author])
  assert.deepEqual(loaded.resources, selection)
  assert.deepEqual(loaded.content, doc)
  assert.equal(loaded.is_published, true)
  assert.equal(loaded.has_draft, true)
  assert.equal(loaded.version, await currentVersion())
  await assert.rejects(q("select get_authoring_content($1,$2,'lesson')", [item,student]), /Forbidden/)
  assert.equal(await scalar("select get_authoring_content($1,$2,'page')", [item,author]), null)
  assert.equal(await scalar("select has_function_privilege('anon','get_authoring_content(uuid,uuid,text)','EXECUTE')"), false)
  await assert.rejects(save({ resources: [] }, 'publish', version), /another tab/)
  await save({}, 'publish')
  assert.equal((await links()).length, 2)
  assert.equal((await links()).find(r => r.asset_id === download).source, 'attached')
  assert.equal((await links()).find(r => r.asset_id === image).source, 'embedded')
  const publishedVersion = await currentVersion()
  const published = await scalar('select snapshot from content_revisions where item_id=$1 and version=$2', [item, publishedVersion])
  assert.equal(published.is_published, true)
  assert.deepEqual(published.resources, selection)

  await save({ resources: [], content: { type: 'doc' } })
  assert.equal((await links()).length, 2, 'Draft removal must not affect published resources')
  await save({}, 'publish')
  assert.deepEqual(await links(), [], 'Publishing removal replaces both attachment sets')
  await save({ resources: published.resources, content: published.content })
  assert.deepEqual(await links(), [], 'Loading/saving historical resources is still a draft')
  await save({}, 'publish')
  assert.equal((await links()).length, 2)

  const beforeInvalid = await currentVersion()
  await assert.rejects(save({ resources: [{ asset_id: foreign, purpose: 'download' }] }), /not available/)
  await assert.rejects(save({ resources: [{ asset_id: download, purpose: 'unsupported' }] }), /Invalid resource/)
  await assert.rejects(save({ resources: null }), /must be an array/)
  await assert.rejects(save({ resources: [{ asset_id: download, purpose: 'starter', extra: true }] }), /Invalid resource/)
  await assert.rejects(save({ resources: [{ asset_id: 'not-a-uuid', purpose: 'starter' }] }))
  assert.equal(await currentVersion(), beforeInvalid, 'Invalid selections cannot advance revisions')

  await save({ resources: [...selection, ...selection] })
  assert.equal((await scalar("select snapshot->'resources' from content_drafts where item_id=$1", [item])).length, 1)
  const beforeFailure = {
    version: await currentVersion(), links: await links(),
    lesson: await scalar('select to_jsonb(l) from lessons l where id=$1', [item]),
    draft: await scalar('select snapshot from content_drafts where item_id=$1', [item]),
    history: await scalar('select count(*)::int from content_revisions where item_id=$1', [item]),
  }
  await db.exec(`create function fail_resource_write() returns trigger language plpgsql as $$ begin raise exception 'simulated resource failure'; end $$; create trigger fail_resource_write before insert on item_assets for each row execute function fail_resource_write();`)
  await assert.rejects(save({ title: 'Must roll back' }, 'publish'), /simulated resource failure/)
  assert.equal(await currentVersion(), beforeFailure.version)
  assert.deepEqual(await links(), beforeFailure.links)
  assert.deepEqual(await scalar('select to_jsonb(l) from lessons l where id=$1', [item]), beforeFailure.lesson)
  assert.deepEqual(await scalar('select snapshot from content_drafts where item_id=$1', [item]), beforeFailure.draft)
  assert.equal(await scalar('select count(*)::int from content_revisions where item_id=$1', [item]), beforeFailure.history)
  await db.exec('drop trigger fail_resource_write on item_assets')

  await db.exec('set role service_role')
  await assert.rejects(q('delete from item_assets where item_id=$1', [item]), /Resources must be saved/)
  await assert.rejects(q("update item_assets set purpose='download' where item_id=$1", [item]), /Resources must be saved/)
  await assert.rejects(q('insert into item_assets(item_id,asset_id) values($1,$2)', [item, download]), /Resources must be saved/)
  await save({}, 'publish')
  await assert.rejects(q('insert into item_assets(item_id,asset_id) values($1,$2)', [item, download]), /Resources must be saved/)
  await db.exec('reset role')

  await save({ resources: [{ asset_id: image, purpose: 'image' }], content: doc }, 'publish')
  assert.equal((await links()).length, 1, 'Same explicit/embedded resource must not duplicate')
  assert.equal((await links())[0].source, 'attached')
  await save({ resources: [], content: doc }, 'publish')
  assert.equal((await links())[0].source, 'embedded', 'Removing explicit selection must not remove a still-embedded image')
  await save({ content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mention figure.png here' }] }] } }, 'publish')
  assert.deepEqual(await links(), [], 'A path mentioned in prose is not an embedded resource')
  await save({ resources: selection }, 'unpublish')
  assert.equal(await scalar('select is_published from lessons where id=$1', [item]), false)
  assert.equal((await links()).length, 1)
  await save({}, 'publish')
  assert.equal((await links()).length, 1, 'Republish retains the saved attachment set')
  for (const [table, kind] of [['course_pages','page'],['assessments','assessment']]) {
    const id = await scalar(`insert into ${table}(course_id,title,slug) values($1,'Resource ${kind}','resource-${kind}') returning id`, [course])
    await scalar('select save_content($1,$2,1,$3,$4)', [id,author,{resources:selection},'draft'])
    assert.equal(await scalar('select count(*)::int from item_assets where item_id=$1', [id]),0)
    const read = await scalar('select get_authoring_content($1,$2,$3)', [id,author,kind])
    assert.deepEqual(read.resources,selection)
    await scalar("select save_content($1,$2,2,'{}','publish')", [id,author])
    assert.equal(await scalar('select count(*)::int from item_assets where item_id=$1', [id]),1)
  }
  const checks = await db.exec(fs.readFileSync(new URL('../supabase/verify-resource-revisions.sql',import.meta.url),'utf8'))
  assert(checks[0].rows.every(row => row.passed === true),'Migration verification SQL must pass')
  console.log('PASS: explicit/embedded resource draft isolation, removal, history, ownership, stale saves, rollback, direct-write blocking and republish')
}
