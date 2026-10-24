import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {canCreateCourse,canEditCourse,canManageSite,resolveAuthorAccess} from '../src/lib/accessPolicy.mjs'
const course={id:'course',instructor_id:'owner'}
const users=[null,{id:'student',role:'student'},{id:'owner',role:'instructor'},{id:'other',role:'instructor'},{id:'admin',role:'admin'}]
for(const [index,user] of users.entries()){
 assert.equal(canCreateCourse(user),index>=2)
 assert.equal(canEditCourse(user,course),index===2||index===4)
 assert.equal(canManageSite(user),index===4)
 assert.equal(canEditCourse(user,null),false)
 assert.equal(canEditCourse(user&&{...user,enrollments:['course']},course),index===2||index===4)
}
assert.equal(canEditCourse({id:'owner',role:'student'},course),false)
let actor,queries=[],writes=0,fail=false,extra={}
const db={from(table){queries.push(table);const filters=[];let mutation=false
 const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},is(){return q},
 upsert(){mutation=true;writes++;return q},insert(){mutation=true;writes++;return q},update(){mutation=true;writes++;return q},delete(){mutation=true;writes++;return q},
 async maybeSingle(){return q.single()},
 async single(){
 const rows=extra[table]??(table==='users'?(actor?[actor]:[]):table==='courses'?[course]:table==='lessons'||table==='assessments'?(mutation?[{id:'new',slug:'title'}]:[]):[])
 return {data:mutation?(rows[0]??{id:'new',slug:'title'}):rows.find(row=>filters.every(([k,v])=>row[k]===v))??null,error:fail?{message:'Database failed'}:null}
 },then(resolve){return Promise.resolve({data:[],count:0,error:null}).then(resolve)}};return q}}
async function access(id,courseId){const user=await resolveAuthorAccess(db,id,courseId);return user?{db,user}:null}
function load(file){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const require=name=>{
 if(name==='@clerk/nextjs/server')return {currentUser:async()=>actor?{id:'clerk'}:null}
 if(name==='@/lib/adminAccess')return {authorAccessFor:access,adminAccess:async id=>access(actor?'clerk':null,id)}
 if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}}
 if(name==='@/lib/accessPolicy.mjs')return {canCreateCourse,canEditCourse,canManageSite}
 if(name==='@/lib/documentValidation.mjs')return {documentError:()=>''}
 throw Error('Unexpected import '+name)
 }
 vm.runInNewContext(code,{exports,require,Response,Request,URL,console});return exports
}
for(const user of users){actor=user&&{...user,clerk_id:'clerk'};queries=[]
 const result=await resolveAuthorAccess(db,actor?'clerk':null,'course')
 assert.equal(!!result,user?.id==='owner'||user?.role==='admin')
 assert.ok(!queries.includes('enrollments'))
}
actor={id:'admin',role:'admin',clerk_id:'clerk'}
assert.equal(await resolveAuthorAccess(db,'clerk','missing'),null)
assert.equal(await resolveAuthorAccess(db,'clerk',''),null)
fail=true;assert.equal(await resolveAuthorAccess(db,'clerk','course'),null);fail=false
const routes=[
 ['src/app/api/admin/courses/[courseId]/modules/route.ts',['GET','POST']],
 ['src/app/api/admin/courses/[courseId]/pages/route.ts',['GET','POST']],
 ['src/app/api/admin/courses/[courseId]/assessments/route.ts',['GET','POST']],
 ['src/app/api/admin/courses/[courseId]/lessons/route.ts',['POST']],
 ['src/app/api/admin/courses/[courseId]/modules/[moduleId]/route.ts',['PATCH','DELETE']],
]
for(const [file,methods] of routes){const handlers=load(file)
 for(const user of users)for(const method of methods){actor=user&&{...user,clerk_id:'clerk'};writes=0
 const req=new Request('https://app.test/api',{method,...(method==='GET'?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Title',page_type:'custom'})})})
 const response=await handlers[method](req,{params:Promise.resolve({courseId:'course',moduleId:'module'})})
 const allowed=user?.id==='owner'||user?.role==='admin'
 if(allowed)assert.ok(response.status<400,file+' '+method+' '+response.status)
 else {assert.ok([401,403].includes(response.status),file+' '+method);assert.equal(writes,0)}
 }
}
console.log('PASS: owner/admin course access, enrolled instructor isolation, fail-closed resolution, and real module/page/lesson/assessment route guards')

const grading=load('src/app/api/admin/grading/route.ts')
extra={assessment_attempts:[{id:'attempt',assessment_id:'assessment',user_id:'student'}],assessments:[{id:'assessment',course_id:'course'}],assessment_questions:[{id:'question',assessment_id:'assessment'}]}
for(const user of users){actor=user&&{...user,clerk_id:'clerk'};writes=0
 const response=await grading.POST(new Request('https://app.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_attempt_id:'attempt',question_id:'question',student_id:'student',feedback_text:'Feedback'})}))
 const allowed=user?.id==='owner'||user?.role==='admin'
 assert.equal(response.status,allowed?200:user?403:401)
 assert.equal(writes,allowed?1:0)
}
actor={id:'owner',role:'instructor',clerk_id:'clerk'}
for(const patch of [{student_id:'wrong'},{question_id:'wrong'},{assessment_attempt_id:'wrong'}]){writes=0
 const response=await grading.POST(new Request('https://app.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_attempt_id:'attempt',question_id:'question',student_id:'student',feedback_text:'Feedback',...patch})}))
 assert.ok(response.status>=400);assert.equal(writes,0)
}
console.log('PASS: grading rejects cross-course instructors and mismatched student/question/attempt data')
