import {draftValuesDiffer,draftResourcesDiffer} from './draftComparison.mjs'
const fields=['title','introduction','content','youtube_url','slides_url','slides_meta','module_id']
/** Compare visible lesson content and attachment selections, ignoring revision metadata.
 * @param {Record<string, any>} published
 * @param {Record<string, any>} draft
 * @param {{asset_id:string,purpose:string}[]} publishedResources
 */
export function lessonDraftDiffers(published,draft,publishedResources) {
 if(!published.is_published)return true
 return fields.some(key=>draftValuesDiffer(published[key],draft[key])) || draftResourcesDiffer(publishedResources,draft.resources??[])
}
