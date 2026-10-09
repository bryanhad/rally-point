import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { BadmintonProvider } from '../sports/badminton/BadmintonProvider'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    // Providers live at the root so state survives navigation between pages.
    <BadmintonProvider>
      <div className="bg-slate-100 text-slate-900">
        {/* Mobile-first: full width on phones, a phone-sized column on wider screens.
            Fixed to the viewport height; pages that need to scroll do so inside. */}
        {/* Pages own their padding so header bands can reach the screen edges. */}
        <main className="mx-auto flex h-dvh w-full max-w-xl flex-col overflow-y-auto bg-white shadow-sm">
          <Outlet />
        </main>
        {/* Small dark pill at the top centre; explains actions like undo and switching sides. */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2000,
            style: {
              background: 'var(--color-ink)',
              color: '#fff',
              fontSize: '0.875rem',
              borderRadius: '9999px',
              padding: '6px 14px',
            },
          }}
        />
      </div>
    </BadmintonProvider>
  )
}
