import assert from 'node:assert/strict'
import {validateAssetName,assetDownloadName,assetDownloadHref} from '../src/lib/assetNames.mjs'
import {filterCourseAssets} from '../src/lib/assetSearch.mjs'
import {handleAssetDownload} from '../src/lib/assetDownload.ts'
assert.equal(validateAssetName('  Localization files  '),'Localization files')
for(const name of ['', '  ', 'x'.repeat(201), 'a\r\nb'])assert.throws(()=>validateAssetName(name))
assert.equal(assetDownloadName('Folder structure','owner/uuid.png'),'Folder structure.png')
assert.equal(assetDownloadName('Already.PNG','owner/uuid.png'),'Already.png')
assert.equal(assetDownloadName('日本語 ćwiczenie','file.pdf'),'日本語 ćwiczenie.pdf')
assert.equal(assetDownloadName('CON','file.zip'),'resource-CON.zip')
assert.ok(!/[\r\n/\\<>:"|?*]/.test(assetDownloadName('../bad\r\nname','file.pdf')))
const asset={id:'a',title:'Renamed',original_filename:'IMG_123.png',original_title:'Old title',created_at:'2026-01-01',mime_type:'image/png'}
for(const q of ['Renamed','IMG_123','Old title'])assert.equal(filterCourseAssets([asset],{q}).length,1)

const courseId='11111111-1111-1111-1111-111111111111',assetId='22222222-2222-2222-2222-222222222222',itemId='33333333-3333-3333-3333-333333333333'
const course={id:courseId,instructor_id:'owner',is_published:true,is_public:true,price_cents:0,archived_at:null}
const item={id:itemId,course_id:courseId,status:'published'}
const membership={course_id:courseId,asset_id:assetId,display_name:'Student diagram',assets:{title:'original.png',original_filename:'original.png',bucket:'lesson-images',object_path:'owner/uuid.png',external_url:null}}
let tables,signs=0,signError=false
function reset(){tables={courses:[{...course}],course_items:[{...item}],item_assets:[{item_id:itemId,asset_id:assetId}],course_assets:[structuredClone(membership)],enrollments:[]};signs=0;signError=false}
const db={from(table){const filters=[];const query={select(){return query},eq(key,value){filters.push([key,value]);return query},limit(){return query},maybeSingle:async()=>({data:(tables[table]??[]).find(row=>filters.every(([key,value])=>row[key]===value))??null,error:null}),then(resolve){return Promise.resolve({data:(tables[table]??[]).filter(row=>filters.every(([key,value])=>row[key]===value)),error:null}).then(resolve)}};return query},storage:{from(bucket){assert.equal(bucket,'lesson-images');return {async createSignedUrl(path,seconds,options){signs++;assert.equal(path,'owner/uuid.png');assert.equal(seconds,60);assert.equal(options.download,'Student diagram.png');return signError?{data:null,error:{}}:{data:{signedUrl:'https://storage.test/signed'},error:null}}}}}}
const request=(id=itemId)=>new Request('https://app.test'+assetDownloadHref(courseId,assetId,id))
reset();let response=await handleAssetDownload(request(),db,null)
assert.equal(response.status,303);assert.equal(signs,1);assert.equal(response.headers.get('cache-control'),'private, no-store')
reset();tables.course_items[0].status='draft';assert.equal((await handleAssetDownload(request(),db,null)).status,404);assert.equal(signs,0)
reset();tables.item_assets=[];assert.equal((await handleAssetDownload(request(),db,null)).status,404)
reset();tables.course_items[0].course_id='different';assert.equal((await handleAssetDownload(request(),db,null)).status,404)
reset();tables.courses[0].is_public=false;assert.equal((await handleAssetDownload(request(),db,null)).status,401)
reset();tables.courses[0].price_cents=100;assert.equal((await handleAssetDownload(request(),db,{id:'student',role:'student'})).status,403)
tables.enrollments=[{id:'enrollment',user_id:'student',course_id:courseId}];assert.equal((await handleAssetDownload(request(),db,{id:'student',role:'student'})).status,303)
reset();assert.equal((await handleAssetDownload(request(null),db,{id:'owner',role:'instructor'})).status,303)
reset();assert.equal((await handleAssetDownload(request(null),db,{id:'other',role:'instructor'})).status,404)
reset();tables.course_assets=[];assert.equal((await handleAssetDownload(request(),db,null)).status,404)
reset();tables.courses[0].is_published=false;assert.equal((await handleAssetDownload(request(),db,null)).status,404)
reset();tables.courses[0].archived_at='2026-01-01';assert.equal((await handleAssetDownload(request(),db,{id:'owner',role:'instructor'})).status,404)
reset();tables.course_assets[0].assets.external_url='http://internal.test';assert.equal((await handleAssetDownload(request(),db,null)).status,404);assert.equal(signs,0)
reset();signError=true;assert.equal((await handleAssetDownload(request(),db,null)).status,502)
console.log('PASS: course asset names, safe filenames, original-name search, publication/access checks, and named signed downloads')
