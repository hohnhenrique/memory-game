# Memory Game

https://hohnhenrique.github.io/memory-game

Implementation of the classic Memory Game in **vanilla JavaScript**, with no frameworks or external dependencies. Visual theme inspired by retro recognition terminals — the same visual identity as [Minesweeper](https://github.com/).

🎮 [Play online](#) — *replace with the GitHub Pages link after deploy*

## Features

- Three difficulty levels: easy (4×4, 8 pairs), medium (6×6, 18 pairs) and hard (6×10, 30 pairs)
- 3D flip animation on cards via CSS `transform: rotateY`
- Shuffling with the Fisher-Yates algorithm
- Unique symbols with an exclusive color per pair, making visual recognition easier
- Move counter and matched pairs progress
- Click lock during the non-match animation (prevents fast clicking to cheat)
- Fully keyboard navigable (Tab to move between cards, Enter/Space to flip)
- Responsive, with `prefers-reduced-motion` support

## Technologies

- HTML5
- CSS3 (CSS variables, grid layout, `transform`, `perspective`)
- JavaScript (ES6+, no libraries)

## How to run locally

There is no build step. Just open the `index.html` file in the browser, or run a simple local server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then access `http://localhost:8000`.

## Project structure

```
memory-game/
├── index.html   # page structure
├── style.css    # styles and visual theme
├── script.js    # game logic
└── README.md
```

## Game logic

The core logic is in `script.js` and covers:

- **Deck generation**: `pairs` unique symbols are randomly selected from a pool of 30, duplicated and shuffled with Fisher-Yates
- **Flip and comparison**: when two cards are flipped, the game compares the symbols; if they match, they're marked as found; if not, they flip back after 900ms
- **Click lock**: the `locked` variable prevents interaction while the non-match animation is in progress
- **Win condition**: when `matched === totalPairs`, the congratulations overlay is shown

## Possible future improvements

- Per-match timer and best times ranking
- Mode with images instead of symbols (e.g. country flags, team badges)
- "Shake" animation on cards that didn't form a pair
- Customizable difficulty (number of pairs defined by the user)

## License

Free to use and modify.
# memory-game