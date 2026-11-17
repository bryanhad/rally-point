import confetti from 'canvas-confetti'

// Game won confetti: a gentle, steady rain of mixed party colours (like real confetti, not the
// team's colours) until the dialog closes (Next game). Pieces start anywhere along the top edge and their number scales
// with the screen width, so a tablet looks as full as a phone. Drawn on canvas-confetti's own
// full-screen canvas above the dialogs (z-50), which taps pass through. Never throws, so a
// failure can't break the dialog.

const Z = 60
const EVERY_MS = 250
// About one piece per 130px of width every tick (3 on a 390px phone, 9 on a 1180px tablet).
const PX_PER_PIECE = 130
// Bright party mix: blue, purple, pink, green, yellow, orange, magenta, plus gold and white.
const COLORS = ['#26CCFF', '#A25AFD', '#FF5E7E', '#88FF5A', '#FCFF42', '#FFA62D', '#FF36FF', '#F2C94C', '#FFFFFF']

// Starts the rain and returns a function that stops it and clears the screen.
export function startRain(): () => void {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
    const drop = () => {
      const pieces = Math.max(2, Math.round(window.innerWidth / PX_PER_PIECE))
      for (let i = 0; i < pieces; i++) {
        void confetti({
          // One piece per call and canvas-confetti hands out colours in order, so pick one here
          // (otherwise every piece gets the first colour).
          colors: [COLORS[Math.floor(Math.random() * COLORS.length)]],
          zIndex: Z,
          disableForReducedMotion: true,
          particleCount: 1,
          angle: 270,
          spread: 20,
          startVelocity: 4 + Math.random() * 4,
          gravity: 0.5,
          drift: Math.random() - 0.5,
          ticks: 600,
          scalar: 0.9 + Math.random() * 0.3,
          origin: { x: Math.random(), y: -0.05 },
        })
      }
    }
    drop()
    const timer = setInterval(drop, EVERY_MS)
    return () => {
      clearInterval(timer)
      clearConfetti()
    }
  } catch {
    // Confetti is decoration only.
    return () => {}
  }
}

function clearConfetti() {
  try {
    confetti.reset()
  } catch {
    // Nothing to clear.
  }
}
