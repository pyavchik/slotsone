import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n');
  }

  const hashIndex = trimmed.indexOf(' #');
  const valueWithoutComment = hashIndex >= 0 ? trimmed.slice(0, hashIndex).trim() : trimmed;
  return valueWithoutComment.replace(/\\n/g, '\n');
}

function parseEnvFile(fileContent: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const lines = fileContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex <= 0) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = parseEnvValue(trimmed.slice(equalIndex + 1));
    if (!key) continue;
    parsed[key] = value;
  }
  return parsed;
}

export function loadEnvironmentFiles(): void {
  const loadFile = (candidate: string) => {
    const filePath = resolve(process.cwd(), candidate);
    if (!existsSync(filePath)) return;

    const fileContent = readFileSync(filePath, 'utf8');
    const values = parseEnvFile(fileContent);
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  };

  loadFile('.env');
  const runtimeEnv = process.env.NODE_ENV ?? 'development';
  loadFile(`.env.${runtimeEnv}`);
}
