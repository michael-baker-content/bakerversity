// Generate the fresh-install schema and types from an actual migrated PostgreSQL
// catalog. This tool never reads .env.local or contacts the live database.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite')
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..')
const baseline=fs.readFileSync(path.join(root,'supabase/baseline.sql'),'utf8')
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'))
const schema='-- GENERATED: fresh installations only. Existing projects apply supabase/migrations in order.\n-- Regenerate with npm run db:generate.\n'+baseline+'\n'+migrations.join('\n')
const db=new PGlite()
await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';")
await db.exec(schema.replace(/create extension if not exists "pgcrypto";/,''))
const {rows}=await db.query(`select table_name,column_name,is_nullable,column_default,data_type,udt_name from information_schema.columns where table_schema='public' order by table_name,ordinal_position`)
const {rows:enums}=await db.query(`select t.typname,e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid order by e.enumsortorder`)
const tsType=c=>{
 if(c.data_type==='ARRAY')return c.udt_name==='_text'?'string[]':'Json[]'
 if(c.data_type==='USER-DEFINED')return enums.filter(e=>e.typname===c.udt_name).map(e=>JSON.stringify(e.enumlabel)).join(' | ') || 'string'
 if(['json','jsonb'].includes(c.data_type))return 'Json'
 if(['integer','bigint','smallint','numeric','double precision'].includes(c.data_type))return 'number'
 if(c.data_type==='boolean')return 'boolean'
 return 'string'
}
let output='// GENERATED from supabase/baseline.sql + migrations. Do not hand-edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\nexport interface Database { public: { Tables: {\n'
for(const table of [...new Set(rows.map(c=>c.table_name))]){
 const columns=rows.filter(c=>c.table_name===table)
 const row=columns.map(c=>`${JSON.stringify(c.column_name)}: ${tsType(c)}${c.is_nullable==='YES'?' | null':''}`).join('; ')
 const insert=columns.map(c=>`${JSON.stringify(c.column_name)}${c.is_nullable==='YES'||c.column_default!==null?'?':''}: ${tsType(c)}${c.is_nullable==='YES'?' | null':''}`).join('; ')
 const {rows:fks}=await db.query(`select con.conname, ref.relname as referenced_relation,array(select attname from unnest(con.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.n order by ord) as columns,array(select attname from unnest(con.confkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=con.confrelid and a.attnum=k.n order by ord) as referenced_columns from pg_constraint con join pg_class ref on ref.oid=con.confrelid where con.contype='f' and con.conrelid=('public.'||$1)::regclass`,[table])
 const relationships=fks.map(f=>`{ foreignKeyName: ${JSON.stringify(f.conname)}; columns: ${JSON.stringify(f.columns)}; isOneToOne: false; referencedRelation: ${JSON.stringify(f.referenced_relation)}; referencedColumns: ${JSON.stringify(f.referenced_columns)} }`).join(',')
 output+=`${JSON.stringify(table)}: { Row: {${row}}; Insert: {${insert}}; Update: Partial<{${insert}}>; Relationships: [${relationships}] };\n`
}
output+='}; Views: {}; Functions: {\n'
const {rows:functions}=await db.query(`select p.proname,p.proargnames, array(select format_type(oid,null) from unnest(p.proargtypes::oid[]) oid) as types, format_type(p.prorettype,null) as result from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('get_authoring_content','save_content','set_item_completion','submit_assessment','reorder_course_items','save_course_classification','refresh_course_completion','can_learn')`)
const map=t=>t==='jsonb'?'Json':t==='integer'?'number':t==='boolean'?'boolean':t==='void'?'undefined':t==='text[]'?'string[]':'string'
for(const f of functions)output+=`${f.proname}: { Args: { ${f.proargnames.map((n,i)=>`${n}: ${map(f.types[i])}${n==='p_request'?' | null':''}`).join('; ')} }; Returns: ${map(f.result)} };\n`
output+='}; Enums: {}; CompositeTypes: {} } }\n'
const artifacts={'supabase/schema.sql':schema,'src/lib/database.types.ts':output}
for(const [file,text] of Object.entries(artifacts)){
 if(process.argv.includes('--check')){if(fs.readFileSync(path.join(root,file),'utf8')!==text)throw Error(file+' is stale. Run npm run db:generate.')}
 else fs.writeFileSync(path.join(root,file),text)
}
await db.close()
console.log(process.argv.includes('--check')?'Database artifacts match migrations.':'Generated schema and TypeScript database types.')


