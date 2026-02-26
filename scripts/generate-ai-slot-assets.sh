#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "OPENAI_API_KEY is not set." >&2
  exit 1
fi

IMAGE_GEN_CLI="${IMAGE_GEN_CLI:-$HOME/.codex/skills/imagegen/scripts/image_gen.py}"
SORA_CLI="${SORA_CLI:-$HOME/.codex/skills/sora/scripts/sora.py}"

python3 "$IMAGE_GEN_CLI" generate-batch \
  --input scripts/ai/slot-symbol-prompts.jsonl \
  --out-dir frontend/public/symbols \
  --concurrency 3 \
  --max-attempts 2

python3 "$SORA_CLI" create-and-poll \
  --model sora-2 \
  --prompt-file scripts/ai/win-video-prompt.txt \
  --no-augment \
  --size 1280x720 \
  --seconds 4 \
  --download \
  --variant video \
  --out output/win-overlay-loop.mp4 \
  --json-out output/win-overlay-loop-job.json
