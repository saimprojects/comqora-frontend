const base = import.meta.env.VITE_API_URL || ''
let csrfToken = ''
export const DASHBOARD_LOCKED_EVENT = 'sellflow:dashboard-locked'

function notifyDashboardLocked(response, body) {
  if (
    response.status === 423 &&
    body?.code === 'dashboard_locked' &&
    typeof window !== 'undefined'
  ) {
    window.dispatchEvent(new Event(DASHBOARD_LOCKED_EVENT))
  }
}
function errorMessage(body) {
  if (typeof body === 'string') return body
  if (Array.isArray(body)) return body.map(errorMessage).join(' ')
  if (body && typeof body === 'object')
    return Object.entries(body)
      .map(
        ([k, v]) =>
          `${k === 'detail' || k === 'non_field_errors' ? '' : k.replaceAll('_', ' ') + ': '}${errorMessage(v)}`,
      )
      .join(' ')
  return 'Something went wrong. Please try again.'
}
export class ApiError extends Error {
  status
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export async function api(path, options = {}) {
  const method = options.method || 'GET'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const response = await fetch(`${base}/api/auth/csrf/`, { credentials: 'include' })
    if (!response.ok) throw new ApiError(response.status, 'Could not establish a secure session.')
    csrfToken = (await response.json()).csrfToken
  }
  const isForm = options.body instanceof FormData
  const response = await fetch(`${base}/api/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
      'X-CSRFToken': csrfToken,
      ...options.headers,
    },
  })
  const data =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(() => ({ detail: 'The server returned an unexpected response.' }))
  if (!response.ok) {
    notifyDashboardLocked(response, data)
    throw new ApiError(response.status, errorMessage(data))
  }
  return data
}
export const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) })
export async function privateBlob(path, signal) {
  const response = await fetch(`${base}/api/${path}`, { credentials: 'include', signal })
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: 'Could not load the private document.' }))
    notifyDashboardLocked(response, body)
    throw new ApiError(response.status, errorMessage(body))
  }
  return response.blob()
}
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) })
export async function all(resource) {
  let page = 1
  const results = []
  while (true) {
    const data = await api(`${resource}/?page_size=100&page=${page++}`)
    results.push(...data.results)
    if (!data.next) return results
  }
}
export async function exportOrders(search = '') {
  const response = await fetch(`${base}/api/orders/export/${search}`, { credentials: 'include' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    notifyDashboardLocked(response, body)
    throw new ApiError(
      response.status,
      errorMessage(body || { detail: 'Export failed. Please try again.' }),
    )
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'comqora-orders.csv'
  link.click()
  URL.revokeObjectURL(url)
}
