# Monument Map Game Specification and Development Plan

## Overview

This document defines the product specification and implementation plan for a browser-based geography game in which a player enters a name, sees 5 to 10 famous monuments one by one with images, and places each monument on an interactive world map. The game then calculates a score from the distance between the player's guess and the real monument coordinates, and stores completed game scores by player name for leaderboard and replay purposes.[cite:1][cite:3][cite:7]

Leaflet is a strong technical fit for the map layer because it is a lightweight JavaScript library built for interactive maps, supports mobile-friendly behavior, and works well with OpenStreetMap-based tiles. Draggable markers and click-based map interaction are established patterns in Leaflet examples, which makes the monument placement mechanic straightforward to implement in a web app.[cite:1][cite:7]

## Product Goals

The primary goal is to create a session-based quiz game that is easy to understand in a few seconds: enter a name, place monuments on a world map, and receive a score based on accuracy. A second goal is to create a persistent score history by player name so that repeated play sessions contribute to an ongoing leaderboard rather than ending as isolated one-off rounds.[cite:3][cite:6]

The initial product should favor clarity and reliability over content scale. A curated set of hand-verified monuments is preferable for the first version because world heritage and monument datasets can provide georeferenced locations, but image quality, naming consistency, and exact point placement still need manual validation for game use.[cite:2][cite:5]

## Core User Experience

### Session flow

A complete game session should follow this sequence:

1. The player opens the game and enters a name.
2. The game creates a session tied to that name.
3. The player receives a sequence of 5 to 10 monuments, shown one at a time.
4. For each monument, the interface displays the monument name, an image, and an interactive world map.
5. The player places a marker on the map and confirms the guess.
6. The game reveals the correct location, computes distance and score, and advances to the next monument.
7. After the final round, the game stores the total score by player name and displays leaderboard results.[cite:1][cite:3][cite:7]

### Screens

The application should include the following screens or states:

| Screen | Purpose |
|---|---|
| Start screen | Collect player name and explain the rules |
| Question screen | Show monument image, monument name, progress, and interactive map |
| Round result screen | Reveal actual location, distance, and points earned |
| Final score screen | Show total score, per-monument breakdown, and replay action |
| Leaderboard screen/panel | Show best scores and summary stats by player name |

The map interaction should allow both click-to-place and drag-to-adjust input. Leaflet supports draggable markers directly, which helps make the placement experience more forgiving than a single fixed click interaction.[cite:1][cite:7]

## Functional Requirements

### Required features

The MVP should include all of the following:

- Required player name before a game can begin.
- One game session per playthrough.
- Configurable round size with support for 5 to 10 monuments.
- Monument presentation with title and image.
- Interactive world map based on OpenStreetMap rendering through Leaflet.
- One locked guess per monument.
- Automatic distance calculation between guessed coordinates and actual coordinates.
- Per-round score and total session score.
- Persistent score storage by player name.
- Leaderboard display showing historical results.[cite:1][cite:3][cite:7]

### Validation rules

The application should enforce these rules:

- Name must not be empty or whitespace-only.
- A session must not contain duplicate monuments.
- A round cannot be submitted until a guess is placed.
- Monument coordinates must be hidden until the guess is locked.
- Score calculation must be reproducible from stored coordinates and scoring rules.
- Persistent scores should be stored server-side for a production version to avoid client-side tampering and storage limitations in browser contexts.[cite:3][cite:7]

## Game Rules

Each session should contain a randomized selection of monuments from a larger curated pool. The default recommendation is 7 monuments per session, while preserving support for the full requested range of 5 to 10 monuments.[cite:2][cite:5]

Each monument should appear only once per session, and the player should receive feedback immediately after every guess. This feedback should include the guessed point, the real location, the distance in kilometers, and the score awarded for that round.[cite:1][cite:3]

## Monument Content Model

A practical data model for each monument is:

| Field | Description |
|---|---|
| `id` | Internal unique identifier |
| `name` | Display name of the monument |
| `country` | Country or territory |
| `latitude` | Real monument latitude |
| `longitude` | Real monument longitude |
| `imageUrl` | Public image URL used in the game UI |
| `imageAttribution` | Credit/license text |
| `difficulty` | Optional balancing hint |
| `active` | Whether the monument is available in the current pool |

UNESCO world heritage resources and related georeferenced datasets are suitable upstream references because they expose monument and heritage-site location data that can be adapted into a curated game catalog. For the first release, the monument list should still be hand-selected and hand-verified rather than generated entirely from raw datasets.[cite:2][cite:5]

### Suggested starter monuments

A practical initial set for the MVP is:

- Eiffel Tower
- Statue of Liberty
- Colosseum
- Great Pyramid of Giza
- Taj Mahal
- Big Ben
- Sydney Opera House
- Christ the Redeemer
- Machu Picchu
- Petra

This list gives broad geographic spread and a recognizable difficulty curve, but exact coordinates and image licensing should be verified manually before release.[cite:2][cite:5]

## Scoring Model

The game should compute the geodesic distance between the guessed coordinates and the true coordinates using the haversine formula or an equivalent great-circle calculation. This distance should then be translated into a score that rewards precision while still granting partial credit for approximate regional guesses.[cite:3][cite:7]

A recommended continuous scoring formula is:

\[
score = \max(0, \mathrm{round}(5000 \times e^{-distanceKm / 2000}))
\]

This model gives high rewards for very accurate guesses and progressively smaller rewards as the guess moves farther away. If a simpler and more transparent model is preferred, the game can instead use score bands based on distance thresholds, but either model should be computed server-side in production so the leaderboard remains trustworthy.[cite:3]

### Optional score bands

| Distance | Score |
|---|---:|
| 0-25 km | 5000 |
| 25-100 km | 4000 |
| 100-300 km | 3000 |
| 300-1000 km | 2000 |
| 1000-3000 km | 1000 |
| 3000+ km | 250 |

## Persistence and Leaderboards

Scores should be stored by player name across sessions, while each game itself remains a single self-contained session. The leaderboard should aggregate results so players can see at least a best score, number of games played, and optionally an average score over time.[cite:3][cite:6]

A browser-only prototype can temporarily store scores locally, but a production version should use a backend database because embedded or sandboxed browser environments may restrict local storage, and client-only storage does not provide trustworthy multi-user persistence.[cite:3][cite:7]

### Recommended persistence model

| Entity | Fields |
|---|---|
| Player | `id`, `name`, `createdAt` |
| Session | `id`, `playerId`, `startedAt`, `endedAt`, `totalScore`, `roundCount` |
| Guess | `id`, `sessionId`, `monumentId`, `guessLat`, `guessLng`, `distanceKm`, `score`, `orderIndex`, `answeredAt` |
| Leaderboard summary | `playerName`, `bestScore`, `gamesPlayed`, `averageScore`, `lastPlayedAt` |

A normalization choice is still required for player names. The simplest option is to treat the player name as a display label only, while the stronger option is to normalize and deduplicate names so one canonical leaderboard identity exists per entered name.

## Technical Architecture

### Frontend

The frontend should be implemented as a browser-based web app with a lightweight modular structure:

| Module | Responsibility |
|---|---|
| `app` | Bootstrapping and application lifecycle |
| `ui-controller` | Screen rendering, buttons, dialogs, and score panels |
| `map-controller` | Leaflet map, marker placement, reveal state, and bounds fitting |
| `game-controller` | Session state, monument ordering, scoring, and progress |
| `data-store` | Monument loading and score API communication |
| `geo-utils` | Distance calculations and coordinate helpers |

Leaflet is suitable here because it already provides the core primitives needed for this game: map rendering, event handling, markers, draggable markers, and viewport fitting.[cite:1][cite:7]

### Backend

A minimal backend should own session creation, guess submission, score calculation, and leaderboard aggregation. Server-side scoring is important because it prevents a client from modifying score logic before results are saved.[cite:3]

A practical backend stack could be implemented with Go, Node.js, or another lightweight API framework, backed by PostgreSQL or SQLite. The backend should persist players, sessions, guesses, and monument metadata separately so that game analytics and leaderboard summaries remain easy to query.

### Suggested API

| Endpoint | Purpose |
|---|---|
| `POST /api/sessions` | Create a new game session for a player name |
| `GET /api/monuments?count=7` | Return a randomized monument set |
| `POST /api/sessions/:id/guess` | Submit one monument guess |
| `POST /api/sessions/:id/complete` | Finalize the session and total score |
| `GET /api/leaderboard` | Return leaderboard standings |
| `GET /api/players/:name/stats` | Return optional player history and summary stats |

## UX and Presentation Details

The question screen should prioritize three visual elements: the monument name, the monument image, and the map. The primary action should remain obvious at all times so the player immediately understands that the goal is to place a location guess on the world map.[cite:1][cite:7]

After the player confirms a guess, the interface should reveal the actual monument location, draw a line between the guess and the truth, and fit the map so both locations are visible. This makes the scoring feel understandable and turns every round into a feedback moment rather than just a number reveal.[cite:1]

Each monument image should use a verified public asset URL with clear attribution and licensing metadata. That approach is more robust than depending on ad hoc image scraping and aligns with browser-based delivery constraints for external media assets.[cite:2][cite:5]

## Edge Cases and Non-Functional Requirements

The implementation should explicitly handle these conditions:

- Duplicate player names.
- Missing monument images.
- Network failure during guess submission or final save.
- Replay with the same player name.
- Extremely close guesses that require precise distance calculation.
- Invalid monument IDs or malformed coordinates.
- Anti-meridian and world-wrap display edge cases on the map.

The application should also meet these non-functional expectations:

- Responsive layout for desktop and mobile.
- Server-side validation of submitted guesses.
- Fast round transitions.
- Deterministic scoring.
- Recoverable UI state for temporary backend errors.
- Accessible keyboard and pointer interactions for core UI elements.

## Development Plan

### Phase 1: Product definition

- Finalize the monument list and verify exact coordinates.
- Collect image sources with attribution and compatible licensing.
- Lock the scoring formula.
- Define leaderboard rules, including how duplicate names are handled.
- Produce wireframes for start, round, result, and final score states.

### Phase 2: MVP implementation

- Build the start screen and player-name flow.
- Implement Leaflet map rendering with marker placement.
- Implement single-round monument display with image and progress state.
- Add distance calculation and round scoring.
- Add end-of-session summary and leaderboard rendering.
- Persist session results in a backend database.

### Phase 3: Production hardening

- Add retry and error handling for API failures.
- Improve mobile layout and responsive behavior.
- Add image fallback behavior.
- Add analytics or telemetry for abandoned rounds and completion rate.
- Tune scoring balance and monument difficulty.

### Phase 4: Feature expansion

- Add daily challenge mode.
- Add best-score and average-score leaderboards.
- Add category packs or region-based monument sets.
- Add timed mode, streak bonuses, or difficulty modifiers.
- Add player profile statistics and historical session review.

## Delivery Milestones

A four-week implementation schedule is realistic for an MVP:

| Week | Deliverables |
|---|---|
| Week 1 | Finalized content model, monument dataset, wireframes, and backend schema |
| Week 2 | Frontend gameplay shell, Leaflet interaction, and scoring logic |
| Week 3 | Backend session, guess, and leaderboard APIs with persistence |
| Week 4 | UI polish, responsive behavior, validation, testing, and deployment prep |

## Acceptance Criteria

The MVP is complete when all of the following are true:

- The player must enter a valid name before starting a game.
- Each session contains between 5 and 10 monuments.
- No monument is repeated within a single session.
- Every round shows a monument name and image.
- The player can place and lock exactly one final guess per round.
- The application computes distance from guessed and actual coordinates.
- The score is derived deterministically from that distance.
- The total session score is stored by player name.
- The leaderboard displays persisted results.
- Actual coordinates are hidden until the guess is submitted.
- The production build validates scoring server-side.

## Recommended Implementation Direction

The strongest implementation path is a small web application with a Leaflet frontend and a minimal backend for session and leaderboard persistence. This approach keeps the game simple to deploy, aligns well with interactive map patterns already supported by Leaflet, and ensures score storage by player name works reliably across sessions and devices.[cite:1][cite:3][cite:7]
