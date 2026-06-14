# GuessTheMonument

A browser-based geography game. Enter your name, then place 5-10 famous monuments on
an interactive Leaflet/OpenStreetMap world map. Each guess is scored by great-circle
distance from the real location, and results are saved to a persistent leaderboard.

See [GuessTheMonument-game-spec.md](GuessTheMonument-game-spec.md) for the full product spec.

## Running with Docker Compose

```sh
docker compose up --build
```

Then open http://localhost:8080. This runs two containers:

- `frontend` - nginx serving the static `public/` assets and proxying `/api/*` to the backend
- `backend` - the Flask API, with its SQLite database persisted in a named volume (`backend_data`)

## Running locally without Docker

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open http://localhost:3000.

## Project structure

- `backend/` - Flask API, SQLite persistence (players, sessions, guesses), monument
  catalog, and server-side scoring (haversine distance + exponential score curve).
- `public/` - Frontend: `index.html`, `css/style.css`, and ES modules under `js/`
  (`app`, `ui-controller`, `game-controller`, `map-controller`, `data-store`, `geo-utils`).
- `frontend/` - nginx Dockerfile and config for serving `public/` and proxying API requests.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/sessions` | Create a session for `{ playerName, roundCount }` (5-10), returns monuments without coordinates |
| `POST /api/sessions/:id/guess` | Submit `{ monumentId, lat, lng }`, returns distance + score + actual coordinates |
| `POST /api/sessions/:id/complete` | Finalize the session, returns total score and per-round breakdown |
| `GET /api/leaderboard` | Best score, games played, and average score per player |
| `GET /api/players/:name/stats` | Per-player session history |
| `GET /api/monuments?count=7` | Preview a randomized monument set (no session) |

## Notes

- Monument coordinates are never sent to the client until a guess is locked in.
- Scoring is computed and validated server-side: `score = max(0, round(5000 * e^(-distanceKm/2000)))`.
- The frontend shows a placeholder if a monument image fails to load.
