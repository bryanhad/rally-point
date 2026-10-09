import { Dialog, DialogButton } from '../../components/ui/Dialog'
import { AlertIcon } from '../../components/ui/icons'
import { useBadminton, type ResetKey } from './context'

const LABELS: Record<ResetKey, string> = {
  game: 'Your game in progress',
  players: 'Your player list',
  config: 'Your settings',
  history: 'Your match history',
}

// Shown once after an update made some saved data unreadable, listing what was reset.
export function ResetNoticeModal() {
  const { resetNotice, dismissResetNotice } = useBadminton()

  return (
    <Dialog
      open={resetNotice.length > 0}
      badge={<AlertIcon />}
      title="Fresh start for some data"
      description="Rally Point was updated, and some of your saved data no longer fits. We've reset:"
      actions={
        <DialogButton tone="ink" onClick={dismissResetNotice}>
          Okay
        </DialogButton>
      }
    >
      <ul className="w-full space-y-1 rounded-control bg-softer px-4 py-3 text-left text-[15px] font-semibold text-ink">
        {resetNotice.map((key) => (
          <li key={key}>{LABELS[key]}</li>
        ))}
      </ul>
    </Dialog>
  )
}
