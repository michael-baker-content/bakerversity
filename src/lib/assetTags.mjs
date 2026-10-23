/** Normalize optional tags; preserve display casing while deduplicating case-insensitively. */
export function normalizeAssetTags(value){
 if(!Array.isArray(value)||value.some(tag=>typeof tag!=='string'))throw new Error('Tags must be a list of text labels.')
 const tags=[];const seen=new Set()
 for(const entry of value){
  const tag=entry.normalize('NFC').trim()
  if(!tag)continue
  if([...tag].length>50||/[\u0000-\u001f\u007f,]/.test(tag))throw new Error('Each tag must be at most 50 characters and cannot contain commas or control characters.')
  const key=tag.toLowerCase();if(!seen.has(key)){seen.add(key);tags.push(tag)}
 }
 if(tags.length>20)throw new Error('Use up to 20 tags per asset.')
 return tags
}
export function parseAssetTags(value){return normalizeAssetTags(value.split(','))}
