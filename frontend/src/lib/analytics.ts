// Visitor counting with GoatCounter (https://www.goatcounter.com).
//
// Off unless VITE_GOATCOUNTER_URL is set at build time, e.g.
// "https://stats.example.com/count", so local development and builds
// without a stats server send nothing.
//
// GoatCounter's script counts the page that loads. This is a single-page app,
// so moving between routes never loads a page: we turn the script's automatic
// count off ("no_onload") and report each route ourselves.

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string }) => void }
  }
}

const endpoint: string | undefined = import.meta.env.VITE_GOATCOUNTER_URL

let lastPath: string | null = null
let currentPath = ''

function report(path: string) {
  const count = window.goatcounter?.count
  // No path yet: the script loaded before the router resolved a route.
  if (!count || !path || path === lastPath) return
  lastPath = path
  count({ path })
}

/** Loads the GoatCounter script. Call once at startup. */
export function initAnalytics() {
  if (!endpoint) return

  const script = document.createElement('script')
  script.async = true
  script.src = `${endpoint}.js`
  script.dataset.goatcounter = endpoint
  script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true })
  // Routes resolved before the script arrived are reported now.
  script.onload = () => report(currentPath)
  document.head.append(script)
}

/** Reports a route. Only the path is sent: no query string, hash or names. */
export function trackPath(path: string) {
  if (!endpoint) return
  currentPath = path
  report(path)
}
