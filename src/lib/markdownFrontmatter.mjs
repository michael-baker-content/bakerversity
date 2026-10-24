// JSON-quoted scalar strings are valid YAML and cannot inject additional keys.
const keys=['title','kind','section','slug','course_id','course_slug','item_id','module_id','introduction','page_type','assessment_type','is_graded','passing_score','is_required','estimated_minutes','activity_type','placement']
export function markdownWithFrontmatter(body,metadata={}){
 const lines=['bakerversity_export: 1','content_source: "editor"']
 for(const key of keys){
  const value=metadata[key]
  if(typeof value==='string' && value.trim())lines.push(key+': '+JSON.stringify(value))
  else if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))lines.push(key+': '+String(value))
 }
 return ['---',...lines,'---','',body].join('\n')
}
