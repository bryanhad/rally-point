import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initAnalytics, trackPath } from './lib/analytics'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// Count each page the visitor lands on or navigates to (the app never reloads).
// The event also fires for search/hash changes; trackPath ignores repeats of the same path.
initAnalytics()
router.subscribe('onResolved', ({ toLocation }) => trackPath(toLocation.pathname))

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
