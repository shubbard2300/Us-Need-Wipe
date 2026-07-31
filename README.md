# Us Need Wipe

A Candyland-style board race with a Pacman twist. Roll the die to move along a
winding board toward the castle. Land on a poop tile and you've got a couple
seconds to wipe (mash `W` or tap WIPE) before it costs you — and don't let the
angry bushes chasing you catch up.

## Running locally

This is a static site — no build step required.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` — page structure and inline SVG character/board art
- `game.css` — styling and animations
- `game.js` — game state, movement, wipe quick-time event, bush AI
