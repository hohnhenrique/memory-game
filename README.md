# Memory Game

A classic Memory Game built with **vanilla JavaScript** — no frameworks, no dependencies. Visual theme inspired by retro recognition terminals, matching the identity of the [Minesweeper](https://github.com/) project.

🎮 [Play online](https://hohnhenrique.github.io/memory-game)

## Features

- Three difficulty levels: easy (4×4, 8 pairs), medium (6×6, 18 pairs) and hard (6×10, 30 pairs)
- 3D card flip animation via CSS `transform: rotateY`
- Fisher-Yates shuffle algorithm for randomized decks
- Unique symbols with exclusive color per pair for easier visual recognition
- Timer, move counter and pair progress tracker
- Click lock during mismatch animation (prevents cheating by clicking fast)
- Shared leaderboard (top 10 per difficulty) powered by JSONBin.io
- Score system: base points + speed bonus − mistake penalty, with difficulty multipliers
- Player name required before playing — saved in `localStorage`
- Fully keyboard-navigable (Tab to move, Enter/Space to flip, )
- Responsive layout with `prefers-reduced-motion` support

## Tech stack

- HTML5
- CSS3 (custom properties, grid layout, `transform`, `perspective`)
- JavaScript ES6+ (no libraries)
- [JSONBin.io](https://jsonbin.io) for shared cloud ranking

## Scoring system

| Component | Formula |
|---|---|
| Base | `pairs × 100 × multiplier` |
| Speed bonus | `max(0, 300 − seconds) × multiplier` |
| Mistake penalty | `mistakes × 15 × multiplier` |
| **Total** | `base + bonus − penalty` |

**Difficulty multipliers:** easy ×1 · medium ×2 · hard ×3

## Running locally

No build step required. Just open `index.html` in your browser, or spin up a simple local server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

## Project structure

```
memory-game/
├── index.html   # page structure
├── style.css    # styles and visual theme
├── script.js    # game logic + ranking integration
└── README.md
```

## How it works

The core logic lives in `script.js`:

- **Deck generation**: `pairs` unique symbols are picked from a pool of 30, duplicated and shuffled with Fisher-Yates
- **Flip & compare**: flipping two cards triggers a symbol comparison — match marks them as found; mismatch flips them back after 900ms
- **Click lock**: the `locked` flag blocks interaction while the mismatch animation runs
- **Ranking**: on game completion, the score is posted to JSONBin.io via a `PUT` request; the leaderboard is fetched with `GET` on every open. Falls back to `localStorage` if the API is unavailable
- **Win condition**: when `matched === totalPairs` the congratulations overlay is shown with the final score and leaderboard position

## Possible future improvements

- Mode with images instead of symbols (e.g. country flags, football club badges)
- "Shake" animation on mismatched cards
- Custom difficulty (user-defined number of pairs)
- Sound effects

## License

Free to use and modify.
