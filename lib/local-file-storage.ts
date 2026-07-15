import fs from 'fs/promises';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), '.data');

function assertSafeRelativeKey(key: string): void {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    throw new Error('Invalid local storage key');
  }
}

export function getLocalFileAbsolutePath(key: string): string {
  assertSafeRelativeKey(key);
  const abs = path.resolve(DATA_ROOT, key);
  const root = path.resolve(DATA_ROOT);
  if (!abs.startsWith(`${root}${path.sep}`) && abs !== root) {
    throw new Error('Invalid local storage path');
  }
  return abs;
}

export async function saveLocalFile(key: string, buffer: Buffer): Promise<void> {
  const filePath = getLocalFileAbsolutePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const filePath = getLocalFileAbsolutePath(key);
  return fs.readFile(filePath);
}
