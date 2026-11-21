import { Outlet, createRootRoute } from '@tanstack/react-router'
import { NoticeHost } from '../components/ui/NoticeHost'
import { BadmintonProvider } from '../sports/badminton/BadmintonProvider'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    // Providers live at the root so state survives navigation between pages.
    <BadmintonProvider>
      {/* Fills the viewport at every size; the layout switches by mode (phone / tablet-portrait /
          tablet-landscape variants in theme.css). Fixed to the viewport height: the page scrolls
          inside <main> when it needs to, and the footer stays visible under it. Pages own their
          side padding so header bands can reach the screen edges; the footer owns the bottom
          safe area. */}
      <div className="flex h-dvh flex-col bg-white text-slate-900">
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
          <Outlet />
        </main>
        <footer className="shrink-0 px-4 pt-1 pb-[max(6px,env(safe-area-inset-bottom))] text-center text-xs text-subtle">
          v{__APP_VERSION__} · Made by Bryan Hadinata
        </footer>
        {/* The one notification card (undo/redo, change ends, confirmations), over everything. */}
        <NoticeHost />
      </div>
    </BadmintonProvider>
  )
}
