# HEXLOCK PWA

A local, offline-capable digital prototype of HEXLOCK.

## Features
- 2–4 player local pass-and-play
- Current compact-loop test mix: 8 B / 3 C / 1 D / 4 E
- A and F removed for this compact-loop test version
- D tile locked for each player's first two personal turns
- Touch-friendly tile selection and 60° rotation
- 16×5 hex board
- Automatic loop scoring for closed routes with exactly six direction changes
- Installable PWA with offline cache
- No external libraries

## Run locally
Because service workers require HTTP(S), do not open index.html directly from the filesystem if you want install/offline support.

For example:
python3 -m http.server 8000

Then open:
http://localhost:8000

## GitHub Pages
Upload the contents of this folder to a GitHub repository, then enable Pages:
Settings → Pages → Deploy from branch → main / root.

The app is entirely static.

## Notes
This is a prototype implementation of the current playtest rules. The automated loop detector enumerates simple cycles and counts direction changes. Complex heavily connected late-game boards can produce many candidate cycles, so this should still be validated against physical playtests.

## Replacement rule test
From personal turn 3, a player may replace one of their own tiles instead of placing a new tile. The removed tile returns to that player's supply. Tiles that have become part of a scored loop are locked and cannot be replaced.
