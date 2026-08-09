const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// Adds the admin token to a header set when one is configured. A build-time token ships inside the
// bundle and is therefore not a secret — it only keeps a public demo from being mutated by anyone
// who finds the URL. A deployment that needs real protection should put the admin panel behind a
// login and keep the token server-side.
export function adminHeaders(extra = {}) {
  return ADMIN_TOKEN ? { ...extra, 'X-Admin-Token': ADMIN_TOKEN } : { ...extra }
}
