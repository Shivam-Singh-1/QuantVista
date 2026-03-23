# QuantVista

QuantVista is a full-stack real-time stock dashboard for Indian market symbols, built with React, Vite, Express, Socket.IO, and MongoDB.

It provides live price streaming, historical chart ranges, per-user alerts, watchlists with reusable alert presets, and a portfolio scaffold with transaction tracking and P&L summary.

## Key Features

- Real-time stock updates over WebSocket with adaptive polling
- Historical chart ranges: current, 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, all
- JWT-based authentication (signup, login, current user)
- Alert engine with trigger history and cooldown support
- Watchlists with:
	- Create, rename, delete
	- Add and remove symbols
	- Alert preset templates per watchlist
	- One-click apply preset to all symbols in a watchlist
- Portfolio scaffold with:
	- Buy and sell transactions
	- Transaction history
	- Position aggregation
	- Realized and unrealized P&L summary
- MongoDB persistence with in-memory fallback when DB is unavailable

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, Socket.IO client
- Backend: Node.js, Express, Socket.IO, Axios
- Database: MongoDB with Mongoose
- Authentication: JWT + bcrypt

## Project Structure

.
|-- client
|   |-- src
|   |   |-- components
|   |   |-- App.jsx
|   |   `-- main.jsx
|   `-- package.json
|-- server
|   |-- config
|   |-- models
|   |   |-- Alert.js
|   |   |-- AlertHistory.js
|   |   |-- PortfolioTransaction.js
|   |   |-- Stock.js
|   |   |-- StockLatest.js
|   |   `-- User.js
|   |-- index.js
|   `-- package.json
|-- package.json
`-- README.md

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- MongoDB local instance or Atlas cluster

## Environment Setup

Create a file at server/.env with:

MONGODB_URI=mongodb://127.0.0.1:27017/quantvista
JWT_SECRET=replace_with_a_long_random_secret

Notes:

- If MONGODB_URI is missing or invalid, the server still starts in live-only mode.
- In live-only mode, persistence-dependent features use in-memory storage for the session.

## Installation

Run from repository root:

npm install
npm install --prefix server
npm install --prefix client

## Development Run

Run from repository root:

npm run dev

This starts:

- Backend API and Socket server on http://localhost:3001
- Frontend (Vite) on http://localhost:5173

## API Summary

Authentication

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

Stocks

- GET /api/stocks
- GET /api/stocks/:symbol/latest
- GET /api/stocks/:symbol/history?range=1m&limit=900

Alerts

- GET /api/alerts
- POST /api/alerts
- PUT /api/alerts/:id
- DELETE /api/alerts/:id
- GET /api/alerts/history?limit=50

Watchlists

- GET /api/watchlists
- POST /api/watchlists
- PUT /api/watchlists/:id
- DELETE /api/watchlists/:id
- POST /api/watchlists/:id/symbols
- DELETE /api/watchlists/:id/symbols/:symbol

Watchlist Presets

- POST /api/watchlists/:id/presets
- PUT /api/watchlists/:id/presets/:presetId
- DELETE /api/watchlists/:id/presets/:presetId
- POST /api/watchlists/:id/presets/:presetId/apply

Portfolio

- GET /api/portfolio/transactions
- POST /api/portfolio/transactions
- DELETE /api/portfolio/transactions/:id
- GET /api/portfolio/summary

Health

- GET /api/health

## Real-Time Socket Events

Client emits

- subscribe (symbol)
- unsubscribe (symbol)

Server emits

- stockUpdate
- historicalData
- alertTriggered
- error

## Notes

- Market data is sourced from Yahoo Finance chart endpoints.
- CORS currently allows local frontend and configured production domain.
- Portfolio is a scaffold and can be extended with FIFO/LIFO cost basis modes, dividends, and taxes.

## Suggested Next Enhancements

- Preset editing in the UI
- Duplicate-safe preset apply mode
- Portfolio analytics expansion (drawdown, allocation charts, benchmark comparison)
- Export reports for alerts and portfolio snapshots
