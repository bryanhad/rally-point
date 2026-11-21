import { useEffect, useState } from 'react'

// The current time, refreshed every 30s while `live` (running times tick, at least once a minute).
export function useNow(live = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [live])
  return now
}
