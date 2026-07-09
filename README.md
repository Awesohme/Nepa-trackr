# NEPA Trackr

Power data logging for Igbe Road, Ikorodu. Records IKEDC supply events, visualises patterns, and generates data-backed analysis for formal complaints.

**Stack:** React (Vite) + Turso + Vercel + OpenRouter API

## Features

- **Quick Toggle** — one-tap log power on/off events
- **Timeline View** — 24-hour colour-coded grid (amber = on, red = off)
- **History** — scrollable event log with edit & delete
- **Analysis** — AI-powered pattern detection and letter talking points
- **PWA** — installable on your phone's home screen

## Project Structure

```
api/              ← Vercel serverless functions
├── log.js        POST open/close power events
├── entries.js    GET event history
├── entry.js      PUT update / DELETE single entry
└── analyse.js    POST to OpenRouter for pattern analysis

src/
├── App.jsx
├── components/
│   ├── QuickToggle.jsx
│   ├── TimelineView.jsx
│   ├── HistoryList.jsx
│   ├── AnalysisPanel.jsx
│   ├── LogForm.jsx
│   ├── EditEntryModal.jsx
│   └── ConfirmModal.jsx
└── main.jsx
```

## Getting Started

```bash
npm install
npm run dev
```

## Deploy

Push to main — Vercel auto-deploys. Environment variables required:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `OPENROUTER_API_KEY`

---

Contributor: Awesohme
Built for Igbe Road, Ikorodu.
