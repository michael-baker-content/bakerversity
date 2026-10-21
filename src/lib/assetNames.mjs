/** @param {unknown} value */
export function validateAssetName(value) {
  if(typeof value!=='string')throw new Error('Enter an asset name.')
  const name=value.trim()
  if(!name || Array.from(name).length>200 || /[\x00-\x1f\x7f]/.test(name))throw new Error('Use an asset name of 1–200 characters without control characters.')
  return name
}
/** Keep the actual file extension; never use the name as a storage path.
 * @param {string} name @param {string|null|undefined} original */
export function assetDownloadName(name,original) {
  const extension=(original??'').match(/\.([a-zA-Z0-9]{1,12})$/)?.[1]??''
  let base=name.normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g,'-').trim()
  if(extension && base.toLowerCase().endsWith('.'+extension.toLowerCase()))base=base.slice(0,-extension.length-1)
  base=Array.from(base).slice(0,160).join('').replace(/^[. ]+|[. ]+$/g,'')||'resource'
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base))base='resource-'+base
  return base+(extension?'.'+extension:'')
}
export function assetDownloadHref(courseId,assetId,itemId) {
  const params=new URLSearchParams({course_id:courseId,asset_id:assetId})
  if(itemId)params.set('item_id',itemId)
  return '/api/assets/download?'+params.toString()
}
