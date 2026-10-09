import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ResetNoticeModal } from '../../../sports/badminton/ResetNoticeModal'

// Layout shared by all badminton pages.
export const Route = createFileRoute('/sports/badminton')({
  component: BadmintonLayout,
})

function BadmintonLayout() {
  return (
    <>
      <ResetNoticeModal />
      {/* Lets the scoreboard stretch to the remaining viewport height. */}
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </>
  )
}
