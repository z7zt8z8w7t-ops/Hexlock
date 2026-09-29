# Hex Flip PWA

A two-player, offline-capable game with a large 61-cell board, a black theme, and blue and yellow hexagonal counters. Play locally against a person or choose a computer opponent (Easy, Medium, Hard). Big captures animate and show the number of directions and counters flipped. The board starts with two blue and two yellow counters. Blue moves first. A legal move must bracket and flip at least one opposing counter along a straight hex-grid direction. The app handles automatic passes, scores, game end, one-move undo (a full turn when playing the computer), hints, and local autosave. Existing saved Hex Flip games remain playable.

## Replace the Hexlock PWA

Upload **the contents of this folder** to the root of the existing Hexlock GitHub Pages repository, replacing its existing `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js`, and icons. Add `engine.js` and `ai.js`. Commit and wait for Pages to deploy. Keep the same repository and Pages URL. The new service worker cache name clears the old Hexlock assets on activation.

If an already-installed home-screen app still shows the old title or icon after reopening online, remove it and add the updated site to the home screen again. Game progress is saved on the device in local storage and does not sync between devices.

## Run locally

Serve this folder over HTTP rather than opening `index.html` directly, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Installation and offline caching require HTTPS or localhost. The app is static and uses no third-party libraries.
