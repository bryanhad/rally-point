import { createFileRoute } from '@tanstack/react-router'
import { ConfigPage } from '../../../sports/badminton/ConfigPage'

export const Route = createFileRoute('/sports/badminton/config')({
  component: ConfigPage,
})
