/** Initial course-library search: literal, case-insensitive names and extension-aware types.
 * @template {{id:string,title:string,created_at:string,original_filename?:string|null,mime_type?:string|null}} T
 * @param {T[]} rows
 * @param {{q?:string,type?:string,sort?:string}} options
 * @returns {T[]}
 */
export function filterCourseAssets(rows, {q='',type='all',sort='newest'}={}) {
 const term=q.trim().toLocaleLowerCase()
 return rows.filter(a=>{
  const name=((a.title??'')+' '+(a.original_filename??'')).toLocaleLowerCase()
  const ext=(a.original_filename||a.title||'').split('.').pop().toLowerCase()
  const image=(a.mime_type??'').startsWith('image/')
  const pdf=a.mime_type==='application/pdf'||ext==='pdf'
  return (!term||name.includes(term)) && (type==='all'||type==='images'&&image||type==='pdf'&&pdf||type==='other'&&!image&&!pdf)
 }).sort((a,b)=>{
  const order=sort==='name'?a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'}):sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at)
  return order||a.id.localeCompare(b.id)
 })
}
