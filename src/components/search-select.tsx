import { useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface Option { id: string; label: string; hint?: string; color?: string }

interface Props {
  options: Option[]
  /** selected ids */
  value: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  placeholder?: string
  align?: 'start' | 'center' | 'end'
  /** the trigger element, rendered inside a popover trigger */
  trigger: React.ReactElement
  children: React.ReactNode
  clearLabel?: string
}

/** Popover with a search box and a selectable list (single or multiple). */
export function SearchSelect({ options, value, onChange, multiple, placeholder = 'Search…', align = 'start', trigger, children, clearLabel = 'Clear' }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options

  function toggle(id: string) {
    if (!multiple) return onChange(value.includes(id) ? [] : [id])
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <Popover onOpenChange={(open) => !open && setQuery('')}>
      <PopoverTrigger render={trigger}>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-72 gap-0 p-0">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-8 border-0 bg-transparent pl-7 shadow-none focus-visible:ring-0" />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {shown.map((o) => {
            const on = value.includes(o.id)
            return (
              <button type="button" key={o.id} onClick={() => toggle(o.id)}
                className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent', on && 'bg-accent/60')}>
                {o.color && <span className="size-2 shrink-0 rounded-full" style={{ background: o.color }} />}
                <span className="truncate">{o.label}</span>
                {o.hint && <span className="truncate text-xs text-muted-foreground">{o.hint}</span>}
                {on && <Check className="ml-auto size-3.5 shrink-0 text-primary" />}
              </button>
            )
          })}
          {!shown.length && <p className="px-2 py-3 text-center text-sm text-muted-foreground">No results</p>}
        </div>
        {value.length > 0 && (
          <div className="border-t p-1">
            <button type="button" onClick={() => onChange([])} className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent">{clearLabel}</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
