// scripts/bump.mjs — cache-bust static assets in index.html on Vercel builds.
// Replaces every ?v=<anything> in index.html with ?v=<build-timestamp>.
// This makes sure browsers always download the fresh JS/CSS after a deploy.

import { readFile, writeFile } from 'node:fs/promises';

const TS = String(Date.now());
const html = await readFile('index.html', 'utf8');
const updated = html.replace(/\?v=[^"'&\s]+/g, `?v=${TS}`);
await writeFile('index.html', updated);
console.log('[bump] cache version set to', TS);
