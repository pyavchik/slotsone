import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openApiSpec } from '../docs/openapi.js';

const outputPath = path.resolve(process.cwd(), 'openapi.json');
const output = `${JSON.stringify(openApiSpec, null, 2)}\n`;
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  let existing: string;
  try {
    existing = readFileSync(outputPath, 'utf8');
  } catch {
    console.error(`Missing ${outputPath}. Run: npm run openapi:generate`);
    process.exit(1);
  }

  if (existing !== output) {
    console.error(`OpenAPI drift detected in ${outputPath}. Run: npm run openapi:generate`);
    process.exit(1);
  }

  console.log(`OpenAPI spec is up to date: ${outputPath}`);
  process.exit(0);
}

writeFileSync(outputPath, output, 'utf8');
console.log(`OpenAPI spec written: ${outputPath}`);
