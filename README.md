# Band Click

Synchronised click/tempo track for a band. Every member opens a web page on their own phone or laptop (wired earphones), and one press of Start begins the same click on all devices at the same moment.

## Run
```
npm install
npm start
```
The terminal prints LAN addresses. Open `http://<laptop-wifi-ip>:3000` on every device on the same router/hotspot. Use the IPv4 address of the **Wi-Fi adapter** from `ipconfig` (ignore virtual adapters like VirtualBox 192.168.56.x).

## How it works
- No audio is streamed. Each device generates the click locally with the Web Audio API.
- The Node server (`server.js`, `ws` WebSocket) is the shared time reference. It also holds the current state `{startAt, bpm, bpb}` and broadcasts start/stop.
- Each client estimates its clock offset to the server: 30 pings, keep the 5 lowest round trips, take the median offset, smooth updates (30% blend), re-sync every 15 s.
- Client maps server time -> `performance.now()` -> `AudioContext` time using `getOutputTimestamp()` (falls back to `currentTime`), so output latency is compensated where the browser supports it.
- Every beat time is recomputed from `startAt + n * 60000/bpm` each scheduler tick (25 ms, 150 ms lookahead), so audio-clock drift self-corrects.
- Late joiners lock onto the next beat.
- Per-device latency trim (ms) in the UI covers hardware output differences.

## Files
- `server.js` HTTP + WebSocket server, time pings, shared state
- `public/index.html` the whole client UI and scheduler
- `package.json` depends on `ws`

## Known limits
- Plain `http://` on a LAN is not a secure context: no Wake Lock, no PWA install. Disable auto-lock on phones, keep the tab in the foreground.
- iOS needs the "Enable audio" tap.
- Some Android hotspots isolate clients (phones can't reach the laptop). Use a travel router or the laptop's own Windows Mobile Hotspot.
- Bluetooth earphones add 100-200 ms unpredictable latency; use wired.

## Ideas / next steps
- Setlist with BPM, time signature, count-in per song
- Tempo maps (mid-song tempo changes)
- Per-musician settings: accent only, subdivisions, volume, sound, visual flash
- Tap tempo, leader-only controls, rooms with join codes
- Tap-test latency calibration per device
- Local HTTPS (mkcert) for Wake Lock / PWA
- Optional cloud deployment (Fly.io/Railway) as fallback
- Ableton Link would be the theoretical best sync but needs native apps

## v2 features
Setlist (saved to `setlist.json`), count-in bars, tap tempo, per-device settings (volume, sound, accent-only, eighth subdivisions, flash, trim), and leader-only control behind a PIN.
Set the PIN: PowerShell `$env:PIN="4321"; npm start` (default `1234`). Anyone can view; only unlocked leaders can start/stop and edit the setlist.
