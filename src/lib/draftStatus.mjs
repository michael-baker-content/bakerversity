import {draftValuesDiffer,draftResourcesDiffer} from './draftComparison.mjs'
const fields=['title','slug','content','introduction','youtube_url','slides_url','slides_meta','module_id','placement','is_required','estimated_minutes','activity_type','page_type','assessment_type','is_graded','passing_score','intro_content']
/** Compare saved editable fields, excluding timestamps and revision bookkeeping. */
export function savedDraftDiffers(published,draft,resources=[]){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return false
 if(fields.some(key=>Object.hasOwn(draft,key)&&draftValuesDiffer(published[key],draft[key])))return true
 return Array.isArray(draft.resources)&&draftResourcesDiffer(draft.resources,resources,{ignoreDuplicates:true})
}
