export function downloadRecovery(kind: string, fields: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({format:`bakerversity-${kind}-recovery`,formatVersion:1,fields},null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download=`${kind}-recovery.json`;link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
