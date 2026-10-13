const BASE = 'https://api.clockify.me/api/v1'

export interface User { id: string; name: string; activeWorkspace: string }
export interface Project { id: string; name: string; color?: string; clientName?: string }
export interface Tag { id: string; name: string }
export interface TimeEntry {
  id: string
  description: string
  projectId: string | null
  tagIds: string[] | null
  timeInterval: { start: string; end: string | null; duration: string | null }
}

async function request<T>(key: string, path: string, init?: RequestInit): Promise<{ data: T; lastPage: boolean }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-Api-Key': key, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (res.status === 429) throw new Error('Clockify rate limit reached (30 requests/hour). Showing saved data — try again later.')
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid Clockify API key' : `Clockify error ${res.status}`)
  return { data: (await res.json()) as T, lastPage: res.headers.get('Last-Page') === 'true' }
}

async function paginate<T>(key: string, path: string, pageSize: number): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?'
  const all: T[] = []
  for (let page = 1; ; page++) {
    const { data, lastPage } = await request<T[]>(key, `${path}${sep}page=${page}&page-size=${pageSize}`)
    all.push(...data)
    if (lastPage || data.length < pageSize) return all
  }
}

export const getUser = (key: string) => request<User>(key, '/user').then((r) => r.data)

export const getProjects = (key: string, ws: string) => paginate<Project>(key, `/workspaces/${ws}/projects`, 500)
export const getTags = (key: string, ws: string) => paginate<Tag>(key, `/workspaces/${ws}/tags`, 500)

export function getTimeEntries(key: string, ws: string, userId: string, from?: string, to?: string) {
  const q = new URLSearchParams()
  if (from) q.set('start', new Date(`${from}T00:00:00`).toISOString())
  if (to) q.set('end', new Date(`${to}T23:59:59`).toISOString())
  return paginate<TimeEntry>(key, `/workspaces/${ws}/user/${userId}/time-entries?${q}`, 500)
}

export const createTimeEntry = (
  key: string,
  ws: string,
  body: { start: string; end: string; description: string; projectId: string | null; tagIds: string[] },
) => request<TimeEntry>(key, `/workspaces/${ws}/time-entries`, { method: 'POST', body: JSON.stringify(body) })

export function parseDuration(iso: string | null): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return m ? +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) : 0
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
