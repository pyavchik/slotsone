# Slot Rebuild AI Asset Pipeline

This project now includes ready-to-run AI prompt packs and generation scripts:

- Symbol prompts: `scripts/ai/slot-symbol-prompts.jsonl`
- Win-loop video prompt: `scripts/ai/win-video-prompt.txt`
- One-shot generator script: `scripts/generate-ai-slot-assets.sh`

## Prerequisites

1. A valid `OPENAI_API_KEY` with available billing quota.
2. Python 3 with the `openai` package installed.

Install dependency:

```bash
python3 -m pip install --user openai pillow
```

## Generate Symbols + Win Video

```bash
OPENAI_API_KEY=... ./scripts/generate-ai-slot-assets.sh
```

Outputs:

- Symbol PNGs: `frontend/public/symbols/*.png`
- Win overlay clip: `output/win-overlay-loop.mp4`
- Job metadata: `output/win-overlay-loop-job.json`

## Run Symbol-Only Batch

```bash
OPENAI_API_KEY=... python3 /home/ubuntu/.codex/skills/imagegen/scripts/image_gen.py generate-batch \
  --input scripts/ai/slot-symbol-prompts.jsonl \
  --out-dir frontend/public/symbols \
  --concurrency 3 \
  --max-attempts 2
```

## Run Video-Only Job

```bash
OPENAI_API_KEY=... python3 /home/ubuntu/.codex/skills/sora/scripts/sora.py create-and-poll \
  --model sora-2 \
  --prompt-file scripts/ai/win-video-prompt.txt \
  --no-augment \
  --size 1280x720 \
  --seconds 4 \
  --download \
  --variant video \
  --out output/win-overlay-loop.mp4 \
  --json-out output/win-overlay-loop-job.json
```
