const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}
