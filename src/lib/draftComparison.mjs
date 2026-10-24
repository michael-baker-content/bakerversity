// Compare JSON content without treating object-key order as a content change.
// Array order remains meaningful; absent values and null retain legacy equivalence.
function canonical(value) {
 if(Array.isArray(value)) return value.map(canonical)
 if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
 return value ?? null
}
export function draftValuesDiffer(left,right) {
 return JSON.stringify(canonical(left)) !== JSON.stringify(canonical(right))
}
// Resource ordering is presentation-independent. Callers choose whether duplicate
// associations count, preserving the overview and saved-preview contracts.
export function draftResourcesDiffer(left,right,{ignoreDuplicates=false}={}) {
 const keys=rows=>{
  const values=rows.map(row=>row.asset_id+':'+row.purpose)
  return (ignoreDuplicates?[...new Set(values)]:values).sort()
 }
 return JSON.stringify(keys(left)) !== JSON.stringify(keys(right))
}
