// server/colyseus-server.mjs — static HTTP + Colyseus WebSocket server.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/game-room.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  let rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const normalized = path.normalize(rel);
  if (normalized.startsWith('..') || normalized.includes('../') || path.isAbsolute(normalized)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const fullPath = path.resolve(PUBLIC_ROOT, normalized);
  if (!fullPath.startsWith(PUBLIC_ROOT + path.sep) && fullPath !== PUBLIC_ROOT) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server }),
});

gameServer.define('game_room', GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`Shattered Vale 24/7 Colyseus server: http://localhost:${PORT}`);
  console.log(`WebSocket matchmaking: ws://localhost:${PORT}`);
});
