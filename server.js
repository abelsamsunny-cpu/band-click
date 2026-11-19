import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PIN = String(process.env.PIN || '1234');
const FILE = path.join(dir, 'setlist.json');
const now = () => performance.timeOrigin + performance.now();
const num = (v, a, b, d) => Math.min(b, Math.max(a, Math.round(Number(v)) || d));

let songs = [], current = 0, click = null;
try { ({ songs = [], current = 0 } = JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch {}
const save = () => { try { fs.writeFileSync(FILE, JSON.stringify({ songs, current })); } catch {} };

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(path.join(dir, 'public', 'index.html')));
});
const wss = new WebSocketServer({ server });

const broadcast = () => {
  const s = JSON.stringify({ type: 'state', click, songs, current, n: wss.clients.size });
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
};

wss.on('connection', (ws) => {
  ws.leader = false;
  broadcast();
  ws.on('close', broadcast);
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'ping') return ws.send(JSON.stringify({ type: 'pong', id: m.id, ts: now() }));
    if (m.type === 'auth') {
      ws.leader = String(m.pin) === PIN;
      return ws.send(JSON.stringify({ type: 'auth', ok: ws.leader }));
    }
    if (!ws.leader) return; // everything below is leader-only
    if (m.type === 'add') {
      songs.push({ name: String(m.name || 'Song').slice(0, 40), bpm: num(m.bpm, 20, 300, 120),
        bpb: num(m.bpb, 1, 16, 4), countIn: num(m.countIn, 0, 4, 1) });
      save();
    } else if (m.type === 'del' && songs[m.i]) {
      songs.splice(m.i, 1); click = null;
      current = Math.min(current, Math.max(0, songs.length - 1)); save();
    } else if (m.type === 'move' && songs[m.i] && songs[m.i + m.d]) {
      [songs[m.i], songs[m.i + m.d]] = [songs[m.i + m.d], songs[m.i]];
      if (current === m.i) current += m.d; else if (current === m.i + m.d) current -= m.d;
      save();
    } else if (m.type === 'select' && songs[m.i]) {
      current = m.i; click = null; save();
    } else if (m.type === 'start' && songs[current]) {
      const s = songs[current];
      click = { startAt: now() + 2000, bpm: s.bpm, bpb: s.bpb, countIn: s.countIn * s.bpb };
    } else if (m.type === 'stop') click = null;
    broadcast();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Band Click running. Leader PIN: ${PIN} (change with PIN env var)`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || [])
      if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${PORT}`);
});
