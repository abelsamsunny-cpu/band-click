# Project context for Claude Code

Goal: band-wide synchronised click track, inspired by beatsync.gg's approach (shared clock + local playback, nothing streamed).

Decisions made:
- Local Node server on a laptop over a router/hotspot (best sync, ~1-3 ms), not cloud.
- Clicks generated locally with Web Audio; scheduled on the audio clock, never setTimeout for beats.
- Server clock is the reference; clients use min-RTT NTP-style offset estimation.
- Wired earphones; per-device trim slider for output latency.

Dev environment: Windows, PowerShell (needed `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` for npm), Node 26 LTS.
Status: v1 works on laptop (round trip 0.4 ms); phone connection over hotspot still being debugged (use Wi-Fi adapter IP, check Windows Firewall Public profile for Node, client isolation).
See README.md for architecture and the roadmap.
