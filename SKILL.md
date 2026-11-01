---
name: whatif-reel-maker
description: Make a 60-second vertical 'What if…' 3D science reel (Three.js scene, narrator, captions, sound) from a one-line idea for @the.whatif.studio.
---

# What-If Reel Maker

The user gives ONE line (e.g. "what if the Moon disappeared for 5 seconds"). You do everything else and hand back `final.mp4` (1080x1920, 30 fps, 60 s, narrated, captioned, with sound effects) plus `caption.txt` for Instagram. Don't ask questions unless the idea is unclear. Pick sensible defaults and say which ones you picked.

The house style is a low-poly 3D real-world location built in code (Three.js). It has a countdown HUD top-left, italic serif captions, a white-outline-on-black "x-ray" section, a big-picture shot (planet/space/micro), an escalating aftermath, and an end card with a follow button. Handle: **@the.whatif.studio**.

## 0. One-time setup (check, install only what's missing)

Requires Node 18+, Python 3.10+ and ffmpeg on PATH (`winget install ffmpeg` / `brew install ffmpeg`).

Project root: `~/whatif/` (create if missing). Shared engine files live in the root, and each video lives in `videos/<slug>/`.

```bash
mkdir -p ~/whatif/models ~/whatif/videos && cd ~/whatif
npm init -y && npm i three@0.170 playwright @fontsource/cormorant-garamond @fontsource/ibm-plex-mono
npx playwright install chromium
pip install kokoro-onnx soundfile scipy numpy
curl -L -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
Then copy the engine files from this skill's `engine/` folder into the root if they don't exist (see section 9). On Windows use `python` instead of `python3`.

## 1. Physics first (most important)

Commenters will check the science. Before writing anything:
- Work out what REALLY happens. Write the reasoning and every number to `videos/<slug>/physics.md`, and compute the numbers with a quick Python calc.
- Look for the counter-intuitive twist (e.g. gravity off: nothing seems to happen at first, because the squeezed rock, water and air spring outward and that push feels like gravity). The twist is the hook.
- Verify key claims with web search when it's available. If something is uncertain, soften the wording ("for minutes", "kilometers") and never invent precise figures.

## 2. Script (`videos/<slug>/script.json`)

Follow this 60 s beat template (shift times if the story needs it):

| Time | Beat | Visual | HUD |
|---|---|---|---|
| 0–8 | Normal world, hook | slow dolly through location; title 0.2–3.9 | `<EVENT> IN` countdown `8.00 S`→0, sub = location |
| 8.0 | Event happens | ripple + chroma pulse | — |
| 8–28 | Event window, shown slowed (e.g. 5 real s at 4x) | first normal view, then x-ray | `<EVENT ENDS> IN 5.00 S`, sub `SHOWN 4X SLOWER · <live stat>` |
| 16–24 | Hidden mechanism | outline mode + glowing particles | same |
| 24–28 | Big picture | separate scene (planet/space/cells), white flash in & out | same |
| 28 | Return | flash + boom | `<THING> IS` / `BACK` |
| 28–52 | Aftermath escalates | shake, cracks, waves, debris, etc. | key stat (e.g. `176 KM/H`) |
| ~46 | Punchline | — | "And yes. <consequence>." |
| 51.2–52 | Fade to black | | |
| 52–60 | End card | fact line + FOLLOW FOR MORE WHAT IFS, button press ~57.3 | — |

Narration: 14–16 lines, ≤3 words per second, calm documentary tone. Line 1 at 0.3 s is the title question. The end card has two lines: a one-sentence fact (~52.7) and "Follow for more what ifs." (~56.6). Captions are shortened versions of the narration lines (≤2 lines, `<br>` between).

```json
{
 "handle": "@the.whatif.studio",
 "voice": "am_michael",
 "title": "What if gravity disappeared<br>for 5 seconds?",
 "titleEnd": 3.9,
 "endTitle": "What if gravity disappeared for 5 seconds?",
 "endFact": "You never feel gravity. You feel the ground pushing back.",
 "duration": 60, "endStart": 52, "press": 57.3,
 "narration": [[0.3, "What if gravity disappeared... for five seconds?"], [4.1, "Right now, gravity is pulling on every atom in this park."]],
 "captions": [[4.1, 7.9, "Right now, gravity is pulling<br>on every atom in this park."]]
}
```

## 3. Voice first, then fix timing

Run `python3 gen.py <slug>`. It writes `videos/<slug>/audio/lNN.wav` and `durs.json` and prints each line's length. If a line overlaps the next line or a beat change, shorten the text or move it, then rerun. Then set each caption to `[start, start + duration + 0.35, text]`. Voices: `am_michael` (default male), `af_heart` (best female), `bm_george` (British male).

## 4. Build the scene (`videos/<slug>/scene.js`)

Write a new scene for each video. It must export `build(h)`, `update(t, h)` and `hud(t)` (template in section 9). Rules:
- **Deterministic**: use only `h.rnd()/h.R(a,b)` (seeded) at build time. Everything in `update` is a pure function of `t`. Never use `Math.random`, `Date` or `performance.now`.
- **Slow-mo** via world time: `w = t<8 ? t : t<28 ? 8+(t-8)/4 : 13+(t-28)`. Animate people, water and clouds with `w`.
- **Look**: low-poly primitives with `flatShading`. Model a real place loosely (pier, park, street, beach). Boxes for buildings (canvas window texture), box+sphere people in varied colors, instanced trees, black lamp posts with white globes. Add a gradient sky shader, sprite clouds, `THREE.Fog` for depth, and one sun `DirectionalLight` with shadows (shadow camera ±45) + `HemisphereLight`.
- **Camera**: vertical FOV ~58, eye height 1.7–2.2 m, slow dolly and gentle tilts. In the aftermath, add shake from summed sines.
- **X-ray phase**: return `outline: 0→1` (fade over ~0.6 s). While it's on, swap building maps to `null` and hide clouds (stops noisy edges). Optionally return `overScene`: an additive `Points` scene (depthTest false) for streaks/particles.
- **Big-picture shot**: build a second scene + camera and return them as `scene`/`camera` for 24–28.
- **FX** returned from `update`: `flash` (0–1 white), `chroma`, `ripple` + `rp` (ring radius), `fade` (0→1 at 51.2–52).
- **Performance**: keep draw calls under ~400 (instancing), and avoid many big transparent sprites near the camera, because that overdraw is very slow.
- Keep text out of the bottom 20% and right edge (Instagram UI). Captions sit at y≈1240.

## 5. Preview, then fix

Run `node render.js preview <slug> 2,6,10,18,22,26,30,40,47,55`. It writes JPEGs to `videos/<slug>/prev/`. Open them and check: is the place readable, are captions legible, is the outline mode clean, is the big-picture shot framed, does the aftermath feel dramatic? Fix issues and preview again. Only render the full video when the stills look good.

## 6. Render the layers

The scene (plate) and the text (overlay) render separately, so text fixes don't need a 3D re-render.
```bash
# plate: split across processes (one per 2 CPU cores), each on its own PORT; only 0..endStart (rest is black)
LAYER=plate PORT=8781 node render.js full <slug> plate1.mp4 0 26
LAYER=plate PORT=8782 node render.js full <slug> plate2.mp4 26 52
LAYER=overlay PORT=8783 node render.js full <slug> overlay.mov 0 60
```
Run these in the background and poll the logs. If WebGL reports SwiftShader (slow, CPU), try `HEADFUL=1` to use the real GPU.

## 7. Sound (`videos/<slug>/mix.py`)

Copy the mix template from section 9 and edit the EVENTS block to match the beats: ambience, countdown ticks, a riser before the event, `boom` on the event and the return, a `shimmer` in x-ray, a `whoosh` into the big picture, a rumble/cracks or other aftermath sounds, the end pad and the button `pop`. It places narration automatically and ducks effects under the voice. Run it, then normalize:
```bash
python3 videos/<slug>/mix.py <slug>
ffmpeg -y -i videos/<slug>/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 videos/<slug>/mix_norm.wav
```

## 8. Composite and deliver

```bash
cd videos/<slug>
ffmpeg -y -i plate1.mp4 -i plate2.mp4 -f lavfi -t 8 -i "color=black:s=1080x1920:r=30" -i overlay.mov -i mix_norm.wav \
 -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p,setsar=1[b];[b][3:v]overlay=format=auto,format=yuv420p[v]" \
 -map "[v]" -map 4:a -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 192k -movflags +faststart -shortest final.mp4
```
(The black clip length = duration − endStart.) Extract 8–10 frames from `final.mp4` and look at them before delivering. Write `caption.txt`: a hook line, 2–3 sentences of the real physics, "Follow @the.whatif.studio for more what ifs", and 12–15 hashtags (#whatif #physics #science #3danimation …). Tell the user they can add quiet music in CapCut at 15–20% volume.

## 9. Engine files

The reusable engine lives in this skill's `engine/` folder. Copy the files out of it — do not retype them. One shared engine is reused by every video; two files are copied per video and then edited.

**Shared engine (copy once into `~/whatif/`):**

- `engine/index.html` → `~/whatif/index.html`
- `engine/main.js` → `~/whatif/main.js`
- `engine/render.js` → `~/whatif/render.js`
- `engine/gen.py` → `~/whatif/gen.py`

**Per-video (copy for each new video, then edit):**

- `engine/scene.template.js` → `videos/<slug>/scene.js` — rewrite the scene for each video (see section 4). Must export `build(h)`, `update(t, h)`, `hud(t)`.
- `engine/mix.py` → `videos/<slug>/mix.py` — edit the EVENTS block to match the beats (see section 7).

```bash
# SKILL_DIR = this skill's folder; run from the project root (~/whatif)
cp "$SKILL_DIR"/engine/{index.html,main.js,render.js,gen.py} ~/whatif/
cp "$SKILL_DIR"/engine/scene.template.js videos/<slug>/scene.js
cp "$SKILL_DIR"/engine/mix.py            videos/<slug>/mix.py
```

## Quality checklist before delivering
- Physics checked and the numbers computed; the twist is clear in the first 15 s.
- Every narration line fits its beat with no overlaps; captions match the narration.
- Previews looked good; the final video was spot-checked at 8–10 frames.
- The handle shows @the.whatif.studio; the end card works and the button press happens just after "Follow for more what ifs".
- Loudness is about −14 LUFS; the voice is clearly above the effects.
