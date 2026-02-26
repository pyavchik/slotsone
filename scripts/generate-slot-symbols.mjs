#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const outDir = path.join(repoRoot, 'frontend/public/symbols');

const symbols = [
  {
    id: '10',
    file: '10.png',
    prompt:
      'Slot machine symbol icon for number 10, polished gold numerals, cartoon casino art style, transparent background, centered, no text outside the symbol.',
  },
  {
    id: 'J',
    file: 'j.png',
    prompt:
      'Slot machine symbol icon for letter J, polished sapphire gem style, cartoon casino art style, transparent background, centered, no extra text.',
  },
  {
    id: 'Q',
    file: 'q.png',
    prompt:
      'Slot machine symbol icon for letter Q, polished amethyst gem style, cartoon casino art style, transparent background, centered, no extra text.',
  },
  {
    id: 'K',
    file: 'k.png',
    prompt:
      'Slot machine symbol icon for letter K, polished emerald gem style, cartoon casino art style, transparent background, centered, no extra text.',
  },
  {
    id: 'A',
    file: 'a.png',
    prompt:
      'Slot machine symbol icon for letter A, polished ruby gem style, cartoon casino art style, transparent background, centered, no extra text.',
  },
  {
    id: 'Star',
    file: 'star.png',
    prompt:
      'Slot machine symbol icon for a lucky golden star emblem, bright highlights, cartoon casino art style, transparent background, centered.',
  },
  {
    id: 'Scatter',
    file: 'scatter.png',
    prompt:
      'Slot machine SCATTER symbol icon as a glowing cyan crystal emblem, cartoon casino art style, transparent background, centered.',
  },
  {
    id: 'Wild',
    file: 'wild.png',
    prompt:
      'Slot machine WILD symbol icon, magenta neon casino badge, cartoon casino art style, transparent background, centered.',
  },
];

async function generateSymbol(symbol) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: symbol.prompt,
      size: '1024x1024',
      response_format: 'b64_json',
      background: 'transparent',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed for ${symbol.id}: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const image = data?.data?.[0]?.b64_json;
  if (!image) {
    throw new Error(`No image returned for ${symbol.id}.`);
  }

  const output = path.join(outDir, symbol.file);
  await fs.writeFile(output, Buffer.from(image, 'base64'));
  console.log(`Generated ${output}`);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  for (const symbol of symbols) {
    await generateSymbol(symbol);
  }
  console.log('Done. Restart frontend if it is running.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
