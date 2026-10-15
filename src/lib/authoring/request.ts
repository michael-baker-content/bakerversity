export class AuthoringRequestError extends Error {
  status: number
  uncertain: boolean
  constructor(message: string, status = 0, uncertain = false) {
    super(message)
    this.name = 'AuthoringRequestError'
    this.status = status
    this.uncertain = uncertain
  }
}

/** No automatic mutation retries: a missing response does not mean a failed write. */
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const mutation = !!init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())
  const timeout = AbortSignal.timeout(30_000)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(url, { ...init, signal, cache: 'no-store' })
  } catch {
    throw new AuthoringRequestError(mutation
      ? 'The save response was lost. Your work is still here. Download a recovery copy, then reload to check what was saved.'
      : 'Unable to load this information. Check your connection and try again.', 0, mutation)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = response.status === 409
      ? 'This item changed in another session. Your work is still here. Download a recovery copy before reloading the latest version.'
      : typeof data?.error === 'string' ? data.error
        : response.status === 401 || response.status === 403
          ? 'Your session or access has changed. Sign in again before continuing.'
          : `The request failed (${response.status}). Please try again.`
    throw new AuthoringRequestError(message, response.status, mutation && response.status >= 500)
  }
  if (!data || typeof data !== 'object') {
    throw new AuthoringRequestError('The server returned an unexpected response. Reload to verify the saved state.', response.status, mutation)
  }
  return data as T
}
