import { useMemo } from 'react'
import { format, startOfWeek } from 'date-fns'
import { FolderOpen } from 'lucide-react'
import { formatDuration, parseDuration, type Project, type Tag, type TimeEntry } from '@/lib/clockify'
import { Badge } from '@/components/ui/badge'

interface Props { entries: TimeEntry[]; projects: Project[]; tags: Tag[] }

const hm = (iso: string) => format(new Date(iso), 'HH:mm')
const secs = (e: TimeEntry) =>
  e.timeInterval.end ? parseDuration(e.timeInterval.duration) : Math.max(0, (Date.now() - +new Date(e.timeInterval.start)) / 1000)

export function EntryList({ entries, projects, tags }: Props) {
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t.name])), [tags])

  const weeks = useMemo(() => {
    const w = new Map<string, { total: number; days: Map<string, TimeEntry[]> }>()
    const sorted = [...entries].sort((a, b) => +new Date(b.timeInterval.start) - +new Date(a.timeInterval.start))
    for (const e of sorted) {
      const d = new Date(e.timeInterval.start)
      const weekKey = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const dayKey = format(d, 'yyyy-MM-dd')
      const week = w.get(weekKey) ?? { total: 0, days: new Map() }
      week.total += secs(e)
      week.days.set(dayKey, [...(week.days.get(dayKey) ?? []), e])
      w.set(weekKey, week)
    }
    return [...w.entries()]
  }, [entries])

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card py-16 text-muted-foreground">
        <FolderOpen className="size-8" />
        <p className="text-sm">No time entries found.</p>
      </div>
    )
  }

  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return (
    <div className="space-y-8">
      {weeks.map(([weekKey, week]) => (
        <section key={weekKey} className="space-y-3">
          <div className="flex items-center justify-between px-1 text-sm">
            <h2 className="font-semibold">{weekKey === thisWeek ? 'This week' : `Week of ${format(new Date(`${weekKey}T00:00`), 'MMM d, yyyy')}`}</h2>
            <span className="text-muted-foreground">Week total: <span className="font-mono font-semibold text-foreground">{formatDuration(week.total)}</span></span>
          </div>
          {[...week.days.entries()].map(([dayKey, list]) => (
            <div key={dayKey} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between bg-muted/50 px-5 py-3 text-sm">
                <span className="font-medium">{format(new Date(`${dayKey}T00:00`), 'EEE, MMM d')}</span>
                <span className="font-mono font-semibold">{formatDuration(list.reduce((s, e) => s + secs(e), 0))}</span>
              </div>
              <ul className="divide-y">
                {list.map((e) => {
                  const p = e.projectId ? projectById.get(e.projectId) : undefined
                  return (
                    <li key={e.id} className="flex flex-col gap-2 px-5 py-4 text-sm hover:bg-muted/30 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="truncate font-medium">{e.description || <span className="text-muted-foreground">(No description)</span>}</span>
                        {p && (
                          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: p.color }}>
                            <span className="size-2 rounded-full" style={{ background: p.color }} />
                            {p.name}{p.clientName && <span className="font-normal text-muted-foreground">· {p.clientName}</span>}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="flex flex-wrap gap-1">
                          {(e.tagIds ?? []).map((id) => <Badge key={id} variant="secondary" className="uppercase">{tagById.get(id) ?? id}</Badge>)}
                        </div>
                        <span className="text-xs text-muted-foreground">{hm(e.timeInterval.start)} – {e.timeInterval.end ? hm(e.timeInterval.end) : 'Now'}</span>
                        <span className="min-w-[4.5rem] text-right font-mono font-semibold">{formatDuration(secs(e))}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
