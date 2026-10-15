const fs=require('node:fs'), path=require('node:path');
const repo=path.resolve(__dirname,'..');
const harness=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'bakerversity-authoring-'));
const put=(name,body)=>{const target=path.join(harness,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body)};
fs.mkdirSync(harness,{recursive:true});
if(!fs.existsSync(path.join(harness,'node_modules')))fs.symlinkSync(path.join(repo,'node_modules'),path.join(harness,'node_modules'),'junction');
for(const folder of ['components','lib'])fs.cpSync(path.join(repo,'src',folder),path.join(harness,'src',folder),{recursive:true});
const lesson='src/app/admin/courses/[slug]/lessons/[lessonId]/page.tsx';put(lesson,fs.readFileSync(path.join(repo,lesson),'utf8'));
put('package.json',JSON.stringify({name:'isolated-authoring-check',private:true,scripts:{dev:'next dev'}}));
put('tsconfig.json',fs.readFileSync(path.join(repo,'tsconfig.json'),'utf8'));
put('next.config.mjs',`export default {transpilePackages:['mafs'],devIndicators:false}`);
put('src/app/layout.tsx',`import Controls from './controls'; export default function Layout({children}:{children:React.ReactNode}) {return <html><body><Controls/>{children}</body></html>}`);
put('src/app/controls.tsx',`'use client'
import {useState} from 'react';
export default function Controls(){const [result,setResult]=useState('');return <aside><strong>ISOLATED TEST HARNESS — simulated API, no live accounts</strong><label>Test mode<select aria-label="Test mode" defaultValue="normal" onChange={async e=>{await fetch('/api/harness',{method:'POST',body:JSON.stringify({mode:e.target.value})});setResult('Mode applied')}}>{['normal','load-failed','validation','conflict','slow','commit-lost'].map(x=><option key={x}>{x}</option>)}</select></label><button type="button" onClick={async()=>setResult(JSON.stringify(await (await fetch('/api/harness')).json()))}>Inspect saved fixture</button><output>{result}</output><hr/></aside>}`);
put('src/app/admin/courses/[slug]/page.tsx',`import Link from 'next/link';export default function Page(){return <main><h1>Test course</h1><Link href="/admin/courses/test/lessons/11111111-1111-4111-8111-111111111111">Open lesson</Link></main>}`);
put('src/app/api/[...path]/route.ts',`import {NextResponse} from 'next/server'
const root=globalThis as unknown as {fixture?:{mode:string;writes:number;publishedResources:unknown[];lesson:Record<string,unknown>}}
function fixture(){return root.fixture??=( {mode:'normal',writes:0,publishedResources:[],lesson:{id:'11111111-1111-4111-8111-111111111111',title:'Test lesson',slug:'test-lesson',introduction:'Fixture introduction',content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Local test content'}]},{type:'image',attrs:{src:'/image.svg',alt:'Fixture image',title:'Existing caption'}},{type:'paragraph'}]},module_id:null,slides_url:null,slides_meta:null,version:1,is_published:true,is_required:true,estimated_minutes:null,activity_type:'explanation',placement:'body'}})}
export async function GET(req:Request){const state=fixture(),p=new URL(req.url).pathname;
if(p==='/api/harness')return NextResponse.json(state);
if(p.includes('course-id-by-slug'))return NextResponse.json({id:'course'});
if(p.endsWith('/history'))return NextResponse.json([{id:'rev',version:1,created_at:'2026-10-14T12:00:00Z',snapshot:{...state.lesson,title:'Old revision'}}]);
if(p.endsWith('/assets'))return NextResponse.json([{id:'22222222-2222-4222-8222-222222222222',title:'Starter resource',url:'/image.svg',alt_text:null,byte_size:1024,item_assets:[]}]);
if(p.endsWith('/modules'))return NextResponse.json([]);
if(p.includes('/lessons/'))return state.mode==='load-failed'?NextResponse.json({error:'Simulated access failure'},{status:403}):NextResponse.json(state.lesson);
return NextResponse.json({editor_tools:['terminal']})}
export async function POST(req:Request){const body=await req.json();if(new URL(req.url).pathname==='/api/harness')fixture().mode=body.mode;return NextResponse.json({ok:true})}
export async function PATCH(req:Request){const state=fixture(),body=await req.json();if(state.mode==='validation')return NextResponse.json({error:'Simulated title validation failure'},{status:400});if(state.mode==='conflict'||body.version!==state.lesson.version)return NextResponse.json({error:'Version conflict'},{status:409});if(state.mode==='slow')await new Promise(r=>setTimeout(r,2500));state.writes++;state.lesson={...state.lesson,...body,version:Number(state.lesson.version)+1,is_published:body.action==='publish'?true:body.action==='unpublish'?false:state.lesson.is_published};if(body.action==='publish'||body.action==='unpublish')state.publishedResources=body.resources??state.publishedResources;if(state.mode==='commit-lost')return NextResponse.json({error:'Simulated lost response after saving'},{status:503});return NextResponse.json({ok:true,version:state.lesson.version})}
export async function DELETE(){return NextResponse.json({ok:true})}`);
put('public/image.svg','<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><rect width="200" height="80" fill="lightblue"/><text x="10" y="45">Fixture image</text></svg>');
console.log(harness);

console.log('Open http://localhost:3101/admin/courses/test — simulated API only; no project environment is loaded.');
const child=require('node:child_process').spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','-p','3101'],{cwd:harness,stdio:'inherit'});
process.on('SIGINT',()=>child.kill());
process.on('SIGTERM',()=>child.kill());
child.on('exit',code=>{process.exitCode=code??0});


