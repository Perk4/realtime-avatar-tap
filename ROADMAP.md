# Roadmap

Web-apps track for `realtime-avatar-tap`. The four-primitive teach API stays on the path. This is not a LemonSlice clone.

## Done

- Teach tap: `openSession`, `ingestAudioChunk`, `emitAvatarBlock`, `assertContinuous` (#1).
- Potato demo: mic or fixture WAV, visible canvas avatar, recorded artifact (#2).

## Now

- Conversation: GPT-Live (`gpt-live-1`) speaks replies. The tap ingests reply PCM only, not the caller. Backend reasoning is `gpt-5.6-terra` (not GPT-4o). Needs `OPENAI_API_KEY` as a Cloud Agent runtime secret.

## Later

- Browser WebRTC full-duplex to the same Live session (optional). Server WebSocket already covers cloud-agent tests.
- Out of scope: GPU renderer, live WebRTC product clone.
