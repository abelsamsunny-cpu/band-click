import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const page = () => fs.readFileSync(path.join(dir, 'public', 'index.html'));
const now = () => performance.timeOrigin + performance.now();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(page());
});

const wss = new WebSocketServer({ server });
let state = null; // { startAt, bpm, bpb } while a click is running

const broadcast = (msg) => {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
};
const sendCount = () => broadcast({ type: 'count', n: wss.clients.size });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', state }));
  sendCount();
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', id: m.id, ts: now() }));
    } else if (m.type === 'start') {
      const bpm = Math.min(300, Math.max(20, Number(m.bpm) || 120));
      const bpb = Math.min(16, Math.max(1, Math.round(Number(m.bpb)) || 4));
      state = { startAt: now() + 2000, bpm, bpb };
      broadcast({ type: 'state', state });
    } else if (m.type === 'stop') {
      state = null;
      broadcast({ type: 'state', state });
    }
  });
  ws.on('close', sendCount);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Band Click running. Open one of these on every device:');
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || [])
      if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${PORT}`);
});
