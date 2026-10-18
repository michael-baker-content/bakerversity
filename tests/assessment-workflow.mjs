import assert from 'node:assert/strict'
export async function testAssessmentWorkflow(db,{author,student,course}) {
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows
 const scalar=async(sql,args=[]) => Object.values((await q(sql,args))[0])[0]
 const assessment=await scalar(`insert into assessments(course_id,title,slug,is_graded) values($1,'Workflow quiz','workflow-quiz',true) returning id`,[course])
 const add=async(type,options,correct,accepted)=>scalar(`insert into assessment_questions(assessment_id,question_type,question_text,options,correct_answer,accepted_answers) values($1,$2,'Original question',$3,$4,$5) returning id`,[assessment,type,options,correct,accepted])
 const mc=await add('multiple_choice',['Wrong','Right'],'1',null),tf=await add('true_false',['true','false'],'false',null),short=await add('short_answer',null,null,['żółć']),free=await add('text_response',null,null,null)
 await assert.rejects(q('select submit_assessment($1,$2,$3,null)',[student,assessment,{}]))
 let version=1
 const save=async(action,patch={})=>{const result=await scalar('select save_content($1,$2,$3,$4,$5)',[assessment,author,version,patch,action]);version=result.version;return result}
 await save('publish')
 let response=await scalar('select submit_assessment($1,$2,$3,$4)',[student,assessment,{[mc]:'1',[tf]:'false',[short]:' ŻÓŁĆ ',[free]:'My explanation'},'00000000-0000-4000-8000-000000000123'])
 assert.equal(response.score,100);assert.equal(response.results.find(r=>r.question_id===free).is_correct,null)
 const attempt=await scalar('select id from assessment_attempts where assessment_id=$1',[assessment])
 await q(`insert into response_feedback(instructor_id,student_id,assessment_attempt_id,question_id,feedback_text) values($1,$2,$3,$4,'Reviewed')`,[author,student,attempt,free])
 assert.equal(await scalar('select feedback_text from response_feedback where assessment_attempt_id=$1',[attempt]),'Reviewed')
 await save('draft',{title:'Draft quiz'})
 assert.equal(await scalar('select title from assessments where id=$1',[assessment]),'Workflow quiz')
 assert.equal((await scalar("select get_authoring_content($1,$2,'assessment')",[assessment,author])).title,'Draft quiz')
 await assert.rejects(q(`update assessment_questions set correct_answer='0' where id=$1`,[mc]))
 await save('unpublish')
 await q(`update assessment_questions set question_text='Edited question' where id=$1`,[free])
 assert.equal((await scalar('select question_snapshot from assessment_attempts where id=$1',[attempt])).find(q=>q.id===free).question_text,'Original question')
 await save('publish')
 response=await scalar('select submit_assessment($1,$2,$3,$4)',[student,assessment,{[mc]:'0',[tf]:'true',[short]:'wrong'},'00000000-0000-4000-8000-000000000124'])
 assert.equal(response.score,0);assert.equal(response.passed,false)
 assert.equal(await scalar('select score from assessment_completions where assessment_id=$1',[assessment]),100)
 // Course-page draft, publication, revision restore and stale-write protection.
 const page=await scalar(`insert into course_pages(course_id,title,slug,is_published) values($1,'Original page','workflow-page',true) returning id`,[course])
 await q(`select save_content($1,$2,1,'{"title":"Draft page"}','draft')`,[page,author])
 assert.equal(await scalar('select title from course_pages where id=$1',[page]),'Original page')
 await q(`select save_content($1,$2,2,'{}','publish')`,[page,author])
 assert.equal(await scalar('select title from course_pages where id=$1',[page]),'Draft page')
 await q(`select save_content($1,$2,3,'{"title":"Original page"}','draft')`,[page,author])
 assert.equal(await scalar('select title from course_pages where id=$1',[page]),'Draft page')
 await assert.rejects(q(`select save_content($1,$2,3,'{}','publish')`,[page,author]))
 console.log('PASS: all four question types, publishing locks, learner grading, feedback, historical snapshots, draft isolation and stale writes')
}
