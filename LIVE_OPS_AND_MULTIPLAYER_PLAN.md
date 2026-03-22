# Bio Defence Online Expansion Plan

## Goal
Turn Bio Defence from a strong single-player tactics puzzler into a replayable live game with:
- global scoreboards
- rivalries and friend challenges
- daily and weekly events
- asynchronous co-op
- mirrored competitive play

Keep the stack as free as possible while the game is small.

## Product Direction

### Phase 1: Online Foundations
- Device-based guest profile with optional name
- Server-verified score submission
- Global leaderboards for:
  - campaign levels
  - endless mode
  - daily challenge
- Personal best tracking
- Daily challenge seed shared by all players

### Phase 2: Rivalries
- Friend codes
- Add/remove rivals
- "You beat X" notifications in-game
- Weekly rivalry ladder based on:
  - best endless run
  - daily challenge score
  - selected campaign milestone clears

### Phase 3: Social Puzzle Loop
- Shareable challenge links
- Featured community challenge board of the week
- Seasonal boss event with a shared global ranking
- Clubs or labs later if the player base justifies it

### Phase 4: Co-op
- Start with async co-op, not live co-op
- One shared outbreak board
- Each player contributes a limited number of actions per cycle
- Shared objective and shared final score
- Cleaner to build and dramatically cheaper than real-time networking

### Phase 5: Competitive Multiplayer
- First PvP mode should be mirrored, deterministic, and cheap:
  - same seed
  - same board
  - same tools
  - same turn cap
- Winner decided by:
  - objective completion
  - score
  - infection control
  - efficiency tiebreakers
- Only pursue true live PvP rooms after async competition proves demand

## Free-First Technical Stack

### Recommended
- Cloudflare Pages for static hosting
- Cloudflare Workers for API endpoints
- Cloudflare D1 for leaderboard/profile/rivalry data
- Durable Objects only when live rooms are needed

### Why
- Great fit for a static web game plus a lightweight API
- Can stay free or near-free longer than many alternatives
- Easy path from scoreboards to real-time rooms later

## Data Model Ideas

### Players
- `player_id`
- `display_name`
- `created_at`
- `last_seen_at`

### Score Submissions
- `submission_id`
- `player_id`
- `mode`
- `level_id`
- `world_id`
- `score`
- `stars`
- `run_seed`
- `game_version`
- `action_log`
- `verified`
- `created_at`

### Rivalries
- `player_id`
- `rival_player_id`
- `created_at`

### Daily Challenges
- `challenge_date`
- `mode`
- `shared_seed`
- `ruleset`

## Anti-Cheat Rule
- Never trust a raw client-submitted score
- Submit:
  - mode
  - seed
  - version
  - action log
- Recompute result server-side before accepting leaderboard placement

## Recommended Build Order
1. Guest profiles and stable player identity
2. Server-verified endless score submission
3. Endless leaderboard
4. Daily challenge mode
5. Daily leaderboard
6. Rival/friend system
7. Mirrored challenge mode
8. Async co-op
9. Live PvP only if metrics justify it

## Immediate Next Task
- Design the server contract for score submission and verification
- Define the leaderboard schema
- Add a daily challenge generator based on fixed seeded content
