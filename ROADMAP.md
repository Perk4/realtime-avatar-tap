# Roadmap

Web-apps track for `realtime-avatar-tap`. The four-primitive teach API stays on the path. This is not a LemonSlice clone.

## Done

- Teach tap: `openSession`, `ingestAudioChunk`, `emitAvatarBlock`, `assertContinuous` (#1).
- Potato demo: mic or fixture WAV, visible canvas avatar, recorded artifact (#2).
- Conversation: GPT-Live (`gpt-live-1`) speaks replies over the server WebSocket WAV hop. The tap ingests reply PCM only, not the caller. Backend reasoning is `gpt-5.6-terra`. Needs `OPENAI_API_KEY` as a runtime secret (#5).
- Browser WebRTC full-duplex: in-page two-way audio to the same Live session. The server mints `POST /api/session`; the key never leaves the server (#7).

## Now

- None locked.

## Later

- Reply-driven recorded demo artifact.
- Out of scope: GPU renderer, LemonSlice product WebRTC clone.
