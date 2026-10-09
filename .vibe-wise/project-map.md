# Project Map

## Purpose
Personal web app used during badminton sessions to keep score, and later to log match/session history and show players with photos.

## Requirements
- SPA. Home page lists supported sports (badminton only for now); clicking navigates to the sport page.
- Badminton page (MVP): two large clickable numbers, one per player/team, each can be incremented and decremented.
- Later: log history of matches and/or sessions of the day.
- Later: manage a list of players; take or upload a photo per player, shown in the UI.
- Later: photos stored on the server file system (no object storage), compressed and cropped to a fixed square.

## Confirmed MVP design (not implemented)
- Routes: `/` sport list, `/sports/badminton` scoreboard. Frontend in `frontend/`.
- localStorage keys `rally-point:badminton:game` and `rally-point:badminton:config`, each with `version`; invalid/stale -> friendly sport-themed warning, reset to fresh state.
- Scoreboard: two big fixed-size square tap-to-increment buttons, decrement below each (floor 0), manual swap button.
- Config: total points; side switch off / every N / at ceil(total/2) (read-only derived); thickness = digit font weight slider. Changes apply immediately, score kept.
- Match point modal when a side's score rises to exactly total: End game (congrats with winning side's players, then reset) / Continue (unlimited). Reappears each time target is reached again.
- Swap moves scores and players. Auto-swap fires whenever either side's score reaches or leaves a trigger value (so undo re-swaps).
- Players (per sport, localStorage): managed via Players button on config page -> modal (name input on top, list below). Read-only defaults "Player 1".."Player 4". Custom players editable, unique case-insensitive, trimmed, non-empty, cannot match default names, deletable (assigned slot falls back to free default). Each player has stable UUID `id`; slots reference ids.
- Assignment: defaults initially; scoreboard top-left/top-right shows each side's players, tap -> picker modal; picking an already-assigned player moves them and fills the old slot with a free default.
- Singles/doubles toggle on scoreboard, default singles, last mode persisted. Doubles->singles keeps index 0 per side. Changing mode when either score > 0 prompts that the game will restart.

## Components
Proposed by learner (nothing implemented yet):
- Frontend: React + Vite; TanStack (which library — Query/Router — not yet decided); an HTTP client.
- Backend: Go (learning goal).
- Database: SQLite.
- Image storage: local file system with image preprocessing.

## Main Flow
Proposed:
User (phone browser) -> React SPA -> ? (HTTP API) -> Go backend -> SQLite / file system
MVP scoreboard may not need the backend.

## Data and Trust Boundaries
Unknown: who can access the app (single user vs anyone with link), auth, upload restrictions.

## Implemented (Step 1)
- `frontend/` Vite 8 + React 19 + TS, Tailwind v4 (`@tailwindcss/vite`), TanStack Router (file-based, `src/routes/`, generated `src/routeTree.gen.ts`), Zod 4.
- `src/lib/storage.ts`: generic load (Zod safeParse, stale flag) / save.
- `src/sports/badminton/schema.ts`: schemas, versions, keys, defaults, DEFAULT_PLAYERS (`default-1..4`).
- `src/sports/badminton/context.ts` (reducer, context, `useBadminton`) + `BadmintonProvider.tsx` (mounted in `__root.tsx`).
- Routes: `/`, `/sports/badminton` (layout `route.tsx` with StaleDataBanner), `/sports/badminton/` and `/config` placeholders.

## Implemented (Step 2)
- `src/sports/badminton/game.ts`: pure reducer (increment/decrement with auto-swap, swap, assignPlayer, setMode, reset) and helpers (isSwapTrigger, playersOf, createHistoryEntry, normalizeMode).
- History: `rally-point:badminton:history` (`{version, entries}` newest first, name+id snapshots, winner side); `addHistoryEntry` in context.
- `Scoreboard.tsx` (page), `HistoryList.tsx`, `Avatar.tsx` + `initials.ts`, shared `src/components/Modal.tsx`, `src/lib/id.ts` (UUID with non-secure-context fallback).
- Layout: root `<main>` fixed `h-dvh` flex column; history scrolls inside.

## Implemented (Step 3)
- `game.ts`: addPlayer (id passed in), renamePlayer, deletePlayer (on-court -> free default; defaults undeletable), `validateName`, `MAX_NAME_LENGTH` = 24.
- `ConfigPage.tsx` (total points, side switch off/every N/at half, thickness slider + preview, Manage players) and `PlayersModal.tsx` (add form, Default section, custom list with inline edit/delete).

## Storage (current, supersedes version notes above)
- Keys: `rally-point:badminton:{game, players, config, history}`. No `version` fields; data kept if it parses; future fields use `.default()`.
- game key `{left, right}`; players key `{players}`; in memory merged as GameState in one reducer, saved separately.
- On load: missing players key -> migrate legacy `players` from game key; `repairGame` replaces unknown/duplicate on-court ids with free defaults and matches mode.
- Unparsable keys reset; `ResetNoticeModal` (badminton layout) lists them as bullets with Okay. Replaced StaleDataBanner.

## Game model (current, supersedes score/side notes above)
- game key `{ start: { lineup: {a, b}, server }, log: GameEvent[] }`. Events: `rally {winner, swapEnds}`, `swapEnds`, `assignPlayer {team, slot, playerId}` (logged only after the first rally; before it, lineup/server edit `start`).
- `replay(state)` in `game.ts` derives `CourtState { teams: {a,b}: {score, ids}, server, leftTeam }` and per-event `LogStep {before, after}`; provider exposes `court` and `steps`.
- Doubles ids[0] = team's right court. Server = serving team's ids[score % 2]. Singles court = server score parity. Team A starts on screen-left; screen row: left half own-right = bottom, right half own-right = top.
- Undo = drop last log entry. Switch serve only before first rally. New game: screen-left team becomes A, A serves.
- UI: `Court.tsx` (green court, lines, `RefereeChair` + `Shuttle` SVGs in `icons.tsx`), `GameLog.tsx`, Match history modal (`HistoryList`), 2-section player picker.

## Team colours
- `TEAM_COLORS` palette in schema.ts (red, blue, orange, purple, slate); config `teamColors {a, b}` stores names, `.catch` per field, `.default` for old configs; `fixTeamColors` on load prevents duplicates.
- `start.leftTeam` (default 'a'): teams keep identity across games; new game: left team serves.
- Used by Court chips, score buttons, GameLog row split tint; ConfigPage ColorRow + Swap colours.
- Winner shown by `Crown` (icons.tsx) on Avatar (`crowned`), in game log, match history, winner modal.

## Game end controls
- `restart` action clears log (same start). End game button enabled when max score >= totalPoints; confirm modal; level scores -> history `winner: 'draw'` (schema enum includes 'draw'). Match point modal End game skips confirm.

## Toolbar and redo
- Scoreboard toolbar above scores: Undo ↶, Redo ↷, Reset 🗑 | "Game of N" | Switch ends ⇄, Switch serve (Shuttle), End game 🏁 (red). `IconButton` with aria-label + title.
- game key `redoLog` (nullable, default null): set at first undo; `redo` re-adds next entry; cleared by any changing action except undo/redo/roster actions (`KEEPS_REDO` in game.ts).
- Toasts: react-hot-toast `<Toaster>` in `__root.tsx` (top-center, dark pill). Fired from Scoreboard handlers: switch ends, switch serve, auto switch (in `rally()`), undo/redo via `describeUndo`/`describeRedo` + `screenScore` in game.ts. Game log UI removed (log internal only).
- Current: bottom section = "Rallies" strip of score chips (`scoreAfter` in Scoreboard.tsx, newest left) → rally modal renders `Court` read-only (`onPick` omitted) with `crownedTeam`. Older: "Previous rally" (`RallyRow` of last rally step) + IconButtons: (Game log removed) Match history (Trophy + Clock) opens `HistoryList` modal.

## Build and Deployment
- Docker: `frontend/Dockerfile` (node:24-alpine build with pnpm 10.33.0 → caddy:2-alpine serving /srv), `frontend/Caddyfile` ({$SITE_ADDRESS::80}, encode, immutable /assets/*, no-cache pages, try_files → index.html), `frontend/.dockerignore`, root `compose.yaml` (service web, ports 80/443/443udp, caddy_data/caddy_config volumes), `.env.example` (SITE_ADDRESS). Verified locally: deep links 200, cache headers, gzip.
- `cd frontend && pnpm dev` / `pnpm build` (vite build then tsc -b) / `pnpm lint` (oxlint).
- Deployment target unknown.

## Unknowns
- When the backend is introduced relative to the MVP.
- Where image crop/compress happens (browser vs server).
- Which TanStack libraries; routing approach.
- SQLite driver choice for Go (CGO vs pure Go).
- Score persistence on refresh / phone lock.
- Data model for matches, sessions, players.
- Deployment and access control.

## Scoreboard layout (current)
- Top bar: ← Sports | Cog (config). Court `top` slot: Singles/Doubles toggle (left) | Switch sides, Switch serve (right). Court, then referee (chair rotated 180°, below court). Row: 'Game of N' | End game, Reset, Redo, Undo. Score buttons. Rallies strip + Match history button.
- App version: `__APP_VERSION__` injected by Vite `define` from package.json (vite.config.ts), typed in `src/globals.d.ts`; shown in home hero.

## UI rework (to ui-design/ mockups) — complete
- Tokens: `src/theme.css` (@theme colours/radii/ease + overlay vars + .sheet-max-h). Team palette hex in schema TEAM_COLORS (mockup values).
- Shared UI in `src/components/ui/`: HeaderBand (+FrameCell, BandCaption), FlipDigits (+digits.ts), primitives (SectionLabel, Card, Button tones), icons (line icons), BottomSheet (portal, drag/X/overlay/Esc close, scroll lock, focus handoff, reduced motion), Dialog + DialogButton + ConfirmDialog (alertdialog, focus safe button), overlay.ts hooks (usePresence, useScrollLock w/ counter, useFocusHandoff, useEscape stack, usePrefersReducedMotion).
- Root <main> has no padding; pages own padding (config/home have temporary wrappers until reworked). max-w-xl (learner's change).
- Scoreboard reworked: HeaderBand (points-to-win FlipDigits, AutoSwapStatus), mode toggle + Sides/Server, Court restyle (receiver white ring), Undo/Redo | Reset/End game, flex score buttons (container-query font) with initials, rallies strip; dialogs: game point, winner, mode change, end, reset, clear history via Dialog/ConfirmDialog; player picker via BottomSheet. RallySheet.tsx (open + number kept separately so close animation keeps content; footer prev/next, 'Latest' disabled on newest) and HistorySheet.tsx (cards: LATEST/DRAW badges, 'd Mon · HH:mm' (+year if older), 'Doubles · to N', winner row first with crown). HistoryList.tsx removed. History entries carry optional `totalPoints`. Old Modal still used only by PlayersModal (config).
- Home: `src/home/HomePage.tsx` (route `/` just renders it). HeaderBand align="left" bottom="lg"; in-progress card when `readLastSport()==='badminton'` and game has rallies (live score FlipDigits w/ team markers, 'Doubles · Game N', Resume); Start a match Singles/Doubles → begin(mode) (setMode or restart, navigate) with ConfirmDialog if a game is running; More sports placeholder; Recent matches = last 2 history entries (relative day), See all → HistorySheet; footer `v{__APP_VERSION__} · Made by Bryan Hadinata`.
- `src/lib/lastSport.ts`: `rally-point:last-sport` (z.enum SPORTS, nullable); written by Scoreboard on mount.
- Game key adds `gameNumber` (default 1); reducer 'newGame' (after End game) increments; restart/setMode keep it.
- HistorySheet owns the Clear ConfirmDialog (used by scoreboard and home). Config page and PlayersSheet reworked; Avatar is now a tone/size initials badge. Old Modal, PlayersModal, HistoryList and unused icons removed.
