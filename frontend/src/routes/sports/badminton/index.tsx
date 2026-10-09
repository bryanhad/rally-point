import { createFileRoute } from '@tanstack/react-router'
import { Scoreboard } from '../../../sports/badminton/Scoreboard'

export const Route = createFileRoute('/sports/badminton/')({
  component: Scoreboard,
})
