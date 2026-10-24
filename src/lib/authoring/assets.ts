import {requestJson} from './request'
export type AssetMetadataPatch={id:string;display_name?:string;alt_text?:string;caption?:string;tags?:string[]}
export function assetEndpoint(courseId?:string){return '/api/admin/assets'+(courseId?'?course_id='+encodeURIComponent(courseId):'')}
/** No retries: an interrupted response may follow a completed upload. */
export async function uploadCourseAsset(file:File,courseId?:string,kind:'image'|'resource'='image'){
 const body=new FormData();body.append('file',file)
 const endpoint=assetEndpoint(courseId)+(courseId?'&':'?')+'kind='+kind
 const result=await requestJson<{asset_id:string;url:string}>(endpoint,{method:'POST',body},kind+' upload')
 if(typeof result.url!=='string'||!result.url||typeof result.asset_id!=='string'||!result.asset_id)throw new Error('The upload response was incomplete. Check the library before retrying.')
 return result
}
export async function saveAssetMetadata(endpoint:string,patch:AssetMetadataPatch){
 return requestJson(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)},'asset details save')
}
