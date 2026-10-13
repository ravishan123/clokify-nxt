import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock, KeyRound, RefreshCw, Tag as TagIcon, User as UserIcon } from 'lucide-react'
import { Toaster } from 'sonner'
import { ApiDialog } from '@/components/api-dialog'
import { EntryList } from '@/components/entry-list'
import { SearchSelect } from '@/components/search-select'
import { TrackerBar } from '@/components/tracker-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClockify } from '@/hooks/use-clockify'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { formatDuration, parseDuration } from '@/lib/clockify'
import { cn } from '@/lib/utils'

export default function App() {
  const [apiKey, setApiKey] = useLocalStorage('clockify_live_api_key')
  const [workspaceId, setWorkspaceId] = useLocalStorage('clockify_live_workspace_id')
  const [userTagId, setUserTagId] = useLocalStorage('clockify_user_tag')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(!apiKey)

  const { user, projects, tags, entries, entriesAt, status, error, refresh, syncMeta, addEntry } = useClockify(apiKey, workspaceId, from, to)

  useEffect(() => { if (status === 'error' && !user) setDialogOpen(true) }, [status, user])

  const userTag = tags.find((t) => t.id === userTagId)
  const filtered = useMemo(
    () => entries.filter((e) => {
      const ids = e.tagIds ?? []
      if (userTag && !ids.includes(userTag.id)) return false
      return !filterTags.length || ids.some((id) => filterTags.includes(id))
    }),
    [entries, filterTags, userTag],
  )
  const total = useMemo(() => filtered.reduce((s, e) => s + parseDuration(e.timeInterval.duration), 0), [filtered])

  const tagOptions = useMemo(() => tags.map((t) => ({ id: t.id, label: t.name })), [tags])
  const initials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const connected = status === 'connected' || (status === 'loading' && !!user)
  const tagLabel = filterTags.length === 0 ? 'All tags' : filterTags.length === 1 ? tags.find((t) => t.id === filterTags[0])?.name ?? '1 tag' : `${filterTags.length} tags`

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><Clock className="size-4" /></span>
            clockify
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('gap-1.5', connected ? 'text-emerald-600' : status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
              <span className={cn('size-1.5 rounded-full', connected ? 'bg-emerald-500' : status === 'error' ? 'bg-destructive' : 'bg-muted-foreground')} />
              {connected ? 'Connected' : status === 'error' ? 'Error' : status === 'loading' ? 'Connecting' : 'Disconnected'}
            </Badge>
            <SearchSelect
              options={tagOptions}
              value={userTag ? [userTag.id] : []}
              onChange={(ids) => setUserTagId(ids[0] ?? '')}
              align="end"
              placeholder="Search your name tag…"
              clearLabel="Show everyone"
              trigger={<Button variant={userTag ? 'secondary' : 'outline'} size="sm" disabled={!user} />}
            >
              <UserIcon />{userTag?.name ?? 'Select user'}<ChevronDown className="opacity-50" />
            </SearchSelect>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}><KeyRound /> API</Button>
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <TrackerBar projects={projects} tags={tags} userTag={userTag} disabled={!user} onAdd={addEntry} />

        <div className="flex flex-wrap items-center gap-2">
          <SearchSelect
            options={tagOptions}
            value={filterTags}
            onChange={setFilterTags}
            multiple
            placeholder="Search tags…"
            clearLabel="Clear filter"
            trigger={<Button variant="outline" disabled={!user} />}
          >
            <TagIcon />{tagLabel}<ChevronDown className="opacity-50" />
          </SearchSelect>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="Start date" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="End date" />
          <Button variant="ghost" size="icon" onClick={refresh} disabled={!user || status === 'loading'} aria-label="Refresh">
            <RefreshCw className={cn(status === 'loading' && 'animate-spin')} />
          </Button>
          <div className="ml-auto text-right text-sm text-muted-foreground">
            {entriesAt && <span className="mr-2 text-xs">updated {new Date(entriesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·</span>}{filtered.length} entries · <span className="font-mono text-base font-semibold text-foreground">{formatDuration(total)}</span>
          </div>
        </div>

        {!apiKey ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-center">
            <KeyRound className="size-8 text-primary" />
            <h3 className="font-semibold">No Clockify connection</h3>
            <p className="max-w-sm text-sm text-muted-foreground">Add your API key to load projects, tags and time entries.</p>
            <Button onClick={() => setDialogOpen(true)}>Add API key</Button>
          </div>
        ) : status === 'loading' && !entries.length ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />)}</div>
        ) : (
          <EntryList entries={filtered} projects={projects} tags={tags} />
        )}
      </main>

      <ApiDialog
        key={`${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={apiKey}
        workspaceId={workspaceId}
        error={status === 'error' ? error : undefined}
        onSave={(k, w) => { setApiKey(k); setWorkspaceId(w) }}
        onSync={syncMeta}
        syncing={status === 'loading'}
        onClear={() => { setApiKey(''); setWorkspaceId(''); setFilterTags([]) }}
      />
      <Toaster position="bottom-right" />
    </div>
  )
}
