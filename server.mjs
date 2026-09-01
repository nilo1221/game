import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

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
  let filePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
  // Sanitize: reject any traversal attempt
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || normalized.includes('..\\') || normalized.includes('../') || path.isAbsolute(normalized)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const publicRoot = path.resolve(__dirname);
  const fullPath = path.resolve(path.join(__dirname, normalized));
  if (!fullPath.startsWith(publicRoot + path.sep)) {
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
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 10);
  clients.set(ws, { id, state: {} });
  ws.send(JSON.stringify({ type: 'id', id }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'state') {
        clients.get(ws).state = msg.payload;
        // broadcast to all other clients
        const others = [];
        for (const [client, info] of clients) {
          if (client !== ws && client.readyState === 1) {
            others.push({ id: info.id, ...info.state });
          }
        }
        ws.send(JSON.stringify({ type: 'players', players: others }));
      } else if (msg.type === 'broadcast') {
        for (const [client, info] of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: msg.payload.type, from: clients.get(ws).id, payload: msg.payload }));
          }
        }
      }
    } catch (e) {
      console.error('[ws] invalid message', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Shattered Vale server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});
