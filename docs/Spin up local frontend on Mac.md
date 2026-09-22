# Spin up the new-gen frontend locally on a Mac

This guide explains how to view the latest Gaming Gaiden data in the new frontend on your Mac,
using data exported by your Windows install.

## Background: where the data comes from

The new frontend is a static single-page app. It does **not** talk to the database or a live server
at runtime. Instead, the PowerShell backend on Windows exports a snapshot of your data into
`frontend/resources/data.json` (and a `data.js` copy). The frontend simply reads that snapshot.

So to see your latest data on the Mac, you copy the exported data file(s) over and run the frontend
locally.

## Step 1: Copy files from your Windows PC

On your Windows install, the files live in the deployed install folder
(`C:\ProgramData\GamingGaiden\frontend\resources\`). Copy the following to your Mac.

### Required

- **`data.json`** — the actual data payload (games, sessions, daily playtime, gaming PCs).

Place it at:

```
frontend/resources/data.json
```

### Recommended (for game/PC artwork to show)

- The **`images/cache/`** folder — the game and PC icons / box art.

Icons are stored as image files here, and the data references them by path. Without this folder the
stats and lists all work fine, but icons/box art will be blank.

Place it at:

```
frontend/resources/images/cache/
```

### You do NOT need these

- `data.js` — regenerated automatically from `data.json` when you run the dev command below.
- `data.json.last` — a backend-only hash used to skip unchanged exports. The frontend never reads it.
- `data_copy.json` / `data_copy.json.last` — not referenced anywhere by the frontend.

## Step 2: Spin up the local frontend

From the `frontend` folder:

```bash
cd frontend
npm install   # first time only
npm run dev
```

The `dev` command:

1. Regenerates `data.js` from your freshly copied `data.json` (keeps them in sync).
2. Bundles the TypeScript app into `resources/js/app.js`.
3. Starts a local HTTP server on port 8080 and opens `http://127.0.0.1:8080/index.html`
   in your browser automatically.

Stop the server with `Ctrl-C`.

## Refreshing with newer data later

Whenever you grab a newer `data.json` from Windows:

1. Replace `frontend/resources/data.json` with the new one (and refresh `images/cache/` if icons changed).
2. Run `npm run dev` again — it re-syncs `data.js` and re-serves the app.

## Why serve over HTTP instead of double-clicking index.html?

Opening `index.html` directly as a `file:///` page makes the app read the older `data.js` snapshot,
which can be stale relative to a freshly copied `data.json`. Serving over HTTP (what `npm run dev`
does) keeps `data.js` in sync with `data.json` and loads reliably.
