const fields=['title','slug','content','introduction','youtube_url','slides_url','slides_meta','module_id','placement','is_required','estimated_minutes','activity_type','page_type','assessment_type','is_graded','passing_score','intro_content']
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value??null}
/** Compare saved editable fields, excluding timestamps and revision bookkeeping. */
export function savedDraftDiffers(published,draft,resources=[]){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return false
 if(fields.some(key=>Object.hasOwn(draft,key)&&JSON.stringify(canonical(published[key]))!==JSON.stringify(canonical(draft[key]))))return true
 const normalize=rows=>[...new Set(rows.map(row=>row.asset_id+':'+row.purpose))].sort()
 return Array.isArray(draft.resources)&&JSON.stringify(normalize(draft.resources))!==JSON.stringify(normalize(resources))
}
