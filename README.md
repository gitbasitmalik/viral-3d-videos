# What-If Reel Maker

A Claude skill that turns a one-line **"what if…"** idea into a finished 60-second
vertical 3D science reel — `1080×1920`, 30 fps, narrated, captioned, with sound
effects — for the Instagram handle **@the.whatif.studio**.

## What it does

Give it one line (e.g. *"what if the Moon disappeared for 5 seconds"*) and it:

1. Works out the real physics and finds the counter-intuitive hook.
2. Writes a 60-second script on a fixed beat template.
3. Generates narration (Kokoro TTS) and fixes caption timing.
4. Builds a low-poly Three.js scene (countdown HUD, x-ray phase, big-picture shot, aftermath, end card).
5. Renders the 3D plate and text overlay as separate layers.
6. Mixes ambience, booms, risers and effects, ducked under the voice.
7. Outputs `final.mp4` + `caption.txt` ready to post.

## Requirements

- Node.js 18+
- Python 3.10+
- `ffmpeg` on PATH (`brew install ffmpeg` / `winget install ffmpeg`)

First run installs the rest (three, playwright, kokoro-onnx, etc.) and downloads
the TTS model — see section 0 of `SKILL.md`.

## Structure

```
whatif-reel-maker/
├── SKILL.md                # full instructions Claude follows (sections 0–9 + checklist)
├── README.md
└── engine/                 # reusable engine, copied into ~/whatif/ at setup
    ├── index.html          # overlay + HUD + canvas
    ├── main.js             # Three.js render loop, post-processing, captions
    ├── render.js           # Playwright headless renderer (preview + full)
    ├── gen.py              # Kokoro narrator
    ├── mix.py              # sound-design mixer (edit EVENTS per video)
    └── scene.template.js   # scene scaffold, rewritten per video
```

## Usage

Install this folder as a skill, then just tell Claude your idea:

> what if the Earth stopped spinning for 10 seconds

Claude handles the rest and hands back `final.mp4` and `caption.txt`.

---
Handle: **@the.whatif.studio**
