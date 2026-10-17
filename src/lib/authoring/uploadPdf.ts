type UploadResult = { url: string; asset_id: string }
async function metadataRequest(body: object): Promise<Record<string, string>> {
  let response: Response
  try {
    response = await fetch('/api/admin/upload-slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000), cache: 'no-store' })
  } catch {
    throw new Error('The PDF upload service could not be reached. Check your connection and try again. Your lesson edits are still here.')
  }
  const data = await response.json().catch(() => null)
  if (response.status === 401 || response.status === 403 || response.redirected) throw new Error('Your session may have expired. Save a recovery copy of your lesson before signing in again.')
  if (!response.ok || !data) throw new Error(typeof data?.error === 'string' ? data.error : `The PDF upload service returned an unexpected response (${response.status}). Please retry.`)
  return data
}

export async function uploadLessonPdf(file: File, onProgress: (percent: number) => void): Promise<UploadResult> {
  if (!/\.pdf$/i.test(file.name) || !file.size || file.size > 50 * 1024 * 1024) throw new Error('Choose a non-empty PDF no larger than 50 MB.')
  const { signedUrl, ticket } = await metadataRequest({ action: 'prepare', name: file.name, size: file.size })
  if (!signedUrl || !ticket) throw new Error('The PDF upload authorization was incomplete. Please retry.')
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.timeout = 5 * 60 * 1000
    xhr.setRequestHeader('Content-Type', 'application/pdf')
    xhr.setRequestHeader('Cache-Control', 'max-age=3600')
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)) }
    xhr.onerror = () => reject(new Error('The connection to PDF storage failed. Check your connection and try again. Your lesson edits are still here.'))
    xhr.ontimeout = () => reject(new Error('The PDF upload timed out after five minutes. Check your connection and try again.'))
    xhr.onabort = () => reject(new Error('The PDF upload was interrupted. Please try again.'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`PDF storage rejected the upload (${xhr.status}). Please retry; if it continues, report this code.`))
    }
    xhr.send(file)
  })
  const result = await metadataRequest({ action: 'complete', ticket })
  if (!result.url || !result.asset_id) throw new Error('The PDF upload could not be confirmed. Please retry.')
  return { url: result.url, asset_id: result.asset_id }
}
