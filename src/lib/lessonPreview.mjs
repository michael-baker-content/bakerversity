const fields=['title','introduction','content','youtube_url','slides_url','slides_meta','module_id']
function canonical(value) {
 if(Array.isArray(value))return value.map(canonical)
 if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
 return value ?? null
}
/** Compare visible lesson content and attachment selections, ignoring revision metadata.
 * @param {Record<string, any>} published
 * @param {Record<string, any>} draft
 * @param {{asset_id:string,purpose:string}[]} publishedResources
 */
export function lessonDraftDiffers(published,draft,publishedResources) {
 if(!published.is_published)return true
 const resources=rows=>[...rows].map(row=>row.asset_id+':'+row.purpose).sort()
 return fields.some(key=>JSON.stringify(canonical(published[key]))!==JSON.stringify(canonical(draft[key]))) || JSON.stringify(resources(publishedResources))!==JSON.stringify(resources(draft.resources??[]))
}
