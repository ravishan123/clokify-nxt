import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  workspaceId: string
  error?: string
  onSave: (apiKey: string, workspaceId: string) => void
  onClear: () => void
  onSync: () => void
  syncing: boolean
}

export function ApiDialog({ open, onOpenChange, apiKey, workspaceId, error, onSave, onClear, onSync, syncing }: Props) {
  const [key, setKey] = useState(apiKey)
  const [ws, setWs] = useState(workspaceId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Clockify API</DialogTitle>
          <DialogDescription>
            Your key is stored only in this browser's local storage and sent only to api.clockify.me.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); onSave(key.trim(), ws.trim()); onOpenChange(false) }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="api-key">API key</Label>
            <Input id="api-key" type="password" required autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your API key" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-id">Workspace ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="ws-id" value={ws} onChange={(e) => setWs(e.target.value)} placeholder="Auto-detected if empty" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {apiKey && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Tags and projects are cached locally. Re-sync only when they change.
              <Button type="button" variant="outline" size="sm" disabled={syncing} onClick={onSync}>Sync</Button>
            </div>
          )}
          <div className="flex justify-between gap-2">
            {apiKey ? (
              <Button type="button" variant="ghost" onClick={() => { onClear(); setKey(''); setWs(''); onOpenChange(false) }}>
                Disconnect
              </Button>
            ) : <span />}
            <Button type="submit">Connect</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
