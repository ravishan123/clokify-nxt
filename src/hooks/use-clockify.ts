import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '@/lib/clockify'

export type Status = 'idle' | 'loading' | 'connected' | 'error'

// Clockify allows only ~30 requests/hour, so everything is cached in localStorage:
//  - user / workspace / projects / tags are fetched once and re-fetched only on "Sync"
//  - entries are fetched once per date range and re-fetched only on "Refresh"
//  - a newly created entry is merged locally (no re-fetch)
const META_KEY = 'clockify_meta_cache'
const ENTRIES_KEY = 'clockify_entries_cache'

interface Meta { apiKey: string; wsOverride: string; ws: string; user: api.User; projects: api.Project[]; tags: api.Tag[]; at: number }
interface Entries { apiKey: string; ws: string; from: string; to: string; entries: api.TimeEntry[]; at: number }

function load<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null } catch { return null }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota / private mode */ }
}
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Request failed')

export function useClockify(apiKey: string, wsOverride: string, from: string, to: string) {
  const [meta, setMeta] = useState<Meta | null>(() => load<Meta>(META_KEY))
  const [cache, setCache] = useState<Entries | null>(() => load<Entries>(ENTRIES_KEY))
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const inflight = useRef(new Set<string>())

  const validMeta = meta && meta.apiKey === apiKey && meta.wsOverride === wsOverride ? meta : null
  const validCache = validMeta && cache && cache.apiKey === apiKey && cache.ws === validMeta.ws && cache.from === from && cache.to === to ? cache : null

  const fail = (e: unknown) => { setError(errMsg(e)); setStatus('error') }

  const syncMeta = useCallback(async () => {
    if (!apiKey || inflight.current.has('meta')) return
    inflight.current.add('meta')
    setStatus('loading'); setError('')
    try {
      const user = await api.getUser(apiKey)
      const ws = wsOverride || user.activeWorkspace
      const [projects, tags] = await Promise.all([api.getProjects(apiKey, ws), api.getTags(apiKey, ws)])
      const next: Meta = { apiKey, wsOverride, ws, user, projects, tags, at: Date.now() }
      save(META_KEY, next); setMeta(next); setStatus('connected')
    } catch (e) { fail(e) } finally { inflight.current.delete('meta') }
  }, [apiKey, wsOverride])

  const loadEntries = useCallback(async () => {
    if (!validMeta || inflight.current.has('entries')) return
    inflight.current.add('entries')
    setStatus('loading'); setError('')
    try {
      const entries = await api.getTimeEntries(apiKey, validMeta.ws, validMeta.user.id, from, to)
      const next: Entries = { apiKey, ws: validMeta.ws, from, to, entries, at: Date.now() }
      save(ENTRIES_KEY, next); setCache(next); setStatus('connected')
    } catch (e) { fail(e) } finally { inflight.current.delete('entries') }
  }, [apiKey, validMeta, from, to])

  // Fetch metadata only when nothing valid is cached.
  useEffect(() => { if (apiKey && !validMeta) void syncMeta() }, [apiKey, validMeta, syncMeta])
  // Fetch entries only when this date range isn't cached.
  useEffect(() => { if (validMeta && !validCache) void loadEntries() }, [validMeta, validCache, loadEntries])
  // Cached data present: show as connected without any request.
  useEffect(() => { if (validMeta && validCache && status === 'idle') setStatus('connected') }, [validMeta, validCache, status])

  const addEntry = useCallback(async (body: { start: string; end: string; description: string; projectId: string | null; tagIds: string[] }) => {
    if (!validMeta) throw new Error('Not connected')
    const { data } = await api.createTimeEntry(apiKey, validMeta.ws, body)
    setCache((c) => {
      const base = c ?? { apiKey, ws: validMeta.ws, from, to, entries: [], at: Date.now() }
      const next = { ...base, entries: [data, ...base.entries] }
      save(ENTRIES_KEY, next)
      return next
    })
  }, [apiKey, validMeta, from, to])

  return {
    user: validMeta?.user ?? null,
    projects: validMeta?.projects ?? [],
    tags: validMeta?.tags ?? [],
    entries: validCache?.entries ?? [],
    entriesAt: validCache?.at,
    status, error,
    refresh: loadEntries,
    syncMeta,
    addEntry,
  }
}
