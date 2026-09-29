# Hex Flip PWA

A two-player, offline-capable pass-and-play version of the A3 print game's rules. The 61-cell board starts with two black and two white counters. Black moves first. A legal move must bracket and flip at least one opposing counter along a straight hex-grid direction. The app handles captures in all six directions, automatic passes, score, game end, one-move undo, legal-move hints, and local autosave.

## Replace the Hexlock PWA

Upload **the contents of this folder** to the root of the existing Hexlock GitHub Pages repository, replacing its existing `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js`, and icons. Add `engine.js`. Commit and wait for Pages to deploy. Keep the same repository and Pages URL. The new service worker cache name clears the old Hexlock assets on activation.

If an already-installed home-screen app still shows the old title or icon after reopening online, remove it and add the updated site to the home screen again. Game progress is saved on the device in local storage and does not sync between devices.

## Run locally

Serve this folder over HTTP rather than opening `index.html` directly, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Installation and offline caching require HTTPS or localhost. The app is static and uses no third-party libraries.
