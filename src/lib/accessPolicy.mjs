/** Account permissions do not depend on enrollment. */
export function canCreateCourse(user){return !!user && ['instructor','admin'].includes(user.role)}
export function canManageSite(user){return user?.role==='admin'}
export function canEditCourse(user,course){return !!course && canCreateCourse(user) && (canManageSite(user)||course.instructor_id===user.id)}
/** Resolve trusted identity and course ownership before privileged operations. */
export async function resolveAuthorAccess(db,clerkId,courseId){
 if(!clerkId)return null
 const {data:user,error:userError}=await db.from('users').select('id, role').eq('clerk_id',clerkId).single()
 if(userError||!canCreateCourse(user))return null
 if(courseId!==undefined){
  if(!courseId)return null
  const {data:course,error}=await db.from('courses').select('instructor_id').eq('id',courseId).single()
  if(error||!canEditCourse(user,course))return null
 }
 return user
}
