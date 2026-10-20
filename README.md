# Pixel World

A pixel-art god game that runs in the browser. Generate a world (or start from an empty one), then watch AI civilizations
found cities, research, trade blows and collapse while wildlife roams the map. Thai and English UI.

## Run it

No build step. Serve the folder and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page shell and all UI styles |
| `data.js` | Terrain, units, buildings, techs and UI text (EN/TH) |
| `game.js` | Core rules: map generation, cities, combat, turns, pathfinding |
| `ai.js` | Computer civilizations |
| `render.js` | Terrain art, the cached map layer and world drawing |
| `chars.js` | Rigged pixel people and their actions |
| `animals.js` | Animal sprites, habitats and predator/prey tables |
| `ui.js` | Input, HUD, dialogs, wildlife and townsfolk behaviour, creature inspector |

## Controls

- Drag to pan, wheel or `+`/`-` to zoom, `Space` to pause, `1`–`5` for speed, `Enter` for one day.
- `D` civilizations, `H` chronicle, `I` statistics, `G` characters.
- With the Look tool, click a city, unit, tile or creature to inspect it.
