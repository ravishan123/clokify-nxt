import { useMemo, useState } from 'react'
import { ChevronDown, FolderPlus, Tag as TagIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, Tag } from '@/lib/clockify'
import { SearchSelect } from '@/components/search-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  projects: Project[]
  tags: Tag[]
  /** the selected user's tag; always added to new entries */
  userTag?: Tag
  disabled: boolean
  onAdd: (e: { start: string; end: string; description: string; projectId: string | null; tagIds: string[] }) => Promise<void>
}

function toDate(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

export function TrackerBar({ projects, tags, userTag, disabled, onAdd }: Props) {
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)

  const project = projects.find((p) => p.id === projectId)
  const projectOptions = useMemo(() => projects.map((p) => ({ id: p.id, label: p.name, hint: p.clientName, color: p.color })), [projects])
  const tagOptions = useMemo(() => tags.map((t) => ({ id: t.id, label: t.name })), [tags])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    let s: Date, f: Date
    if (start && end) {
      s = toDate(start); f = toDate(end)
      if (f <= s) { toast.error('End time must be after start time'); return }
    } else {
      f = new Date(); s = new Date(f.getTime() - 3600_000) // default: last hour
    }
    setBusy(true)
    try {
      await onAdd({ start: s.toISOString(), end: f.toISOString(), description, projectId, tagIds: [...new Set([...tagIds, ...(userTag ? [userTag.id] : [])])] })
      setDescription(''); setTagIds([]); setStart(''); setEnd('')
      toast.success('Time entry added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What have you worked on?"
        className="h-11 text-base"
        disabled={disabled}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchSelect
          options={projectOptions}
          value={projectId ? [projectId] : []}
          onChange={(ids) => setProjectId(ids[0] ?? null)}
          placeholder="Search projects…"
          clearLabel="No project"
          trigger={<Button type="button" variant="outline" disabled={disabled} className="max-w-56" />}
        >
          {project?.color ? <span className="size-2 rounded-full" style={{ background: project.color }} /> : <FolderPlus />}
          <span className="truncate">{project?.name ?? 'Project'}</span>
          <ChevronDown className="opacity-50" />
        </SearchSelect>

        <SearchSelect
          options={tagOptions}
          value={tagIds}
          onChange={setTagIds}
          multiple
          placeholder="Search tags…"
          clearLabel="Clear tags"
          trigger={<Button type="button" variant="outline" disabled={disabled} />}
        >
          <TagIcon />
          {tagIds.length ? `${tagIds.length} tag${tagIds.length > 1 ? 's' : ''}` : 'Tags'}
          <ChevronDown className="opacity-50" />
        </SearchSelect>

        <div className="flex items-center gap-2">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" disabled={disabled} aria-label="Start time" />
          <span className="text-muted-foreground">–</span>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" disabled={disabled} aria-label="End time" />
        </div>

        <Button type="submit" disabled={disabled || busy || !description.trim()} className="ml-auto px-6">
          {busy ? 'Adding…' : 'Add entry'}
        </Button>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">Leave times empty to log the last hour.{userTag ? ` Will be tagged as ${userTag.name}.` : ' Select a user (top right) to tag entries automatically.'}</p>
    </form>
  )
}
