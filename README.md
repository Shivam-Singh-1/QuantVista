# QuantVista

QuantVista is a full-stack real-time stock dashboard built with React, Node.js, Socket.IO, and MongoDB.
It streams live market updates, provides historical chart ranges, and includes account-based price alerts.

## Highlights

- Real-time stock updates over WebSocket (Socket.IO)
- Historical range charting (current, 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, all)
- Authenticated user sessions (signup/login with JWT)
- Per-user alert rules with trigger history
- MongoDB-backed persistence with safe in-memory fallbacks when DB is unavailable

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, Axios
- Database: MongoDB with Mongoose
- Auth: JWT + bcrypt

## Project Structure

```text
.
|-- client/
|   |-- src/
|   `-- package.json
|-- server/
|   |-- config/
|   |-- models/
|   |-- index.js
|   `-- package.json
|-- package.json
`-- README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

## Environment Variables

Create [server/.env](server/.env) with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/quantvista
JWT_SECRET=replace_with_a_long_random_secret
```

If `MONGODB_URI` is missing or invalid, the server starts in a live-only mode with in-memory fallbacks for persistence features.

## Installation

Install dependencies for root, server, and client:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

## Run in Development

From repository root:

```bash
npm run dev
```

This starts:

- Backend API + Socket server: `http://localhost:3001`
- Frontend app (Vite): `http://localhost:5173`

## API Overview

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Stocks:

- `GET /api/stocks`
- `GET /api/stocks/:symbol/latest`
- `GET /api/stocks/:symbol/history?range=1m&limit=900`

Alerts:

- `GET /api/alerts`
- `POST /api/alerts`
- `PUT /api/alerts/:id`
- `DELETE /api/alerts/:id`
- `GET /api/alerts/history?limit=50`

Health:

- `GET /api/health`

## Real-Time Events

Client emits:

- `subscribe` with stock symbol
- `unsubscribe` with stock symbol

Server emits:

- `stockUpdate`
- `historicalData`
- `alertTriggered`
- `error`

## Notes

- Stock data is sourced from Yahoo Finance chart endpoints.
- CORS is currently configured for local frontend and one deployed frontend domain in [server/index.js](server/index.js).

## Roadmap Ideas

- Watchlists and portfolio tracking
- Multi-stock comparison views
- Export chart/history data to CSV
- Deploy-ready production scripts and Docker setup
