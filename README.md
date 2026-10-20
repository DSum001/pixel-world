# Pixel World

**A pixel-art god game that runs in your browser.** You are the creator. Shape a world, plant a few peoples on it, then
watch their civilizations found cities, research technology, trade blows and collapse while wildlife roams the map.
Step in whenever you like: raise mountains, bless a city, or send a meteor.

No install, no build step, no account. English and Thai.

## Quick start

Browsers block local scripts opened straight from disk, so serve the folder and open it:

```sh
npx http-server -p 8000 .
# or: python3 -m http.server 8000
```

Then open <http://localhost:8000> and press **New world**.

## What you can do

- **Generate or paint a world.** Pick a map size (small to huge), a random or blank world, and how many civilizations
  (up to 12). A blank world starts paused so you can paint the land first.
- **Watch AI civilizations live.** Each people has its own language, ruler and temperament (aggressive, peaceful,
  builder, expansionist or scholar). They found cities, build improvements, research 37 techs across six eras
  (Ancient to Modern), build 41 buildings and wonders, field units from warriors to tanks, make peace and declare war.
  AI difficulty is easy, normal or hard.
- **Play god.** Tools on the left:

  | Tool | Effect |
  | --- | --- |
  | Look | Click a city, unit, tile or creature to inspect it |
  | Terrain | Paint ocean, land, forest, hills, mountains and more |
  | Resources | Place resources on the map |
  | Creatures | Release animals into a habitat that suits them |
  | New people | Start a new civilization anywhere |
  | Barbarian camp | Raise raiders |
  | Bless | Boost one city, or give a whole people a bountiful year |
  | Disaster | Meteor, plague, volcano, earthquake, tsunami, lightning |

- **Living world.** Three 40-day seasons make a 120-day year: rains feed cities, winter brings snow and lean harvests,
  summer speeds up work. After Sailing, a people can build boats and cross the sea. Natural disasters can also strike
  on their own (switch them off in the menu).
- **Wildlife and townsfolk.** Over 25 animal species with habitats and predator/prey chains, plus rigged pixel people
  who farm, mine, chop wood, build and fight.
- **Keep the story.** The chronicle logs every founding, wonder, war and disaster. Statistics charts each
  civilization over time, and the characters gallery shows every person and animal animated.
- **Saves.** The game saves to your browser's local storage.

## Controls

| Input | Action |
| --- | --- |
| Drag | Pan the map (two fingers or right-drag while a paint tool is active) |
| Wheel, `+` / `-`, pinch | Zoom |
| Arrow keys | Pan |
| `P` or `Space` | Pause / resume |
| `1`–`5` | Speed ×1, ×5, ×10, ×50, ×100 |
| `Enter` | Skip one day |
| `D` | Civilizations: scores, rulers, war and peace |
| `H` | Chronicle |
| `I` | Statistics |
| `G` | Characters gallery |
| `Esc` | Close a dialog, or go back to the Look tool |

Touch screens work too: the HUD rearranges itself for phones.

## Project layout

| Path | What it holds |
| --- | --- |
| `index.html` | Page shell and markup |
| `css/styles.css` | All UI styles (wood frame and parchment look) |
| `src/core/data.js` | Terrain, units, buildings, techs and UI text (EN/TH) |
| `src/core/game.js` | Core rules: map generation, cities, combat, turns, pathfinding (no DOM) |
| `src/core/ai.js` | Computer civilizations |
| `src/art/render.js` | Terrain art, the cached map layer and world drawing |
| `src/art/chars.js` | Rigged pixel people and their actions |
| `src/art/animals.js` | Animal sprites, habitats and predator/prey tables |
| `src/ui/ui.js` | Input, HUD, dialogs, wildlife and townsfolk behaviour, creature inspector |

Scripts are plain globals loaded in the order listed in `index.html`; keep that order. All art is drawn in code from
small pixel grids, so there are no image files. Fonts load from Google Fonts, so the first load needs a connection.
