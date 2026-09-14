# realtime-avatar-tap roadmap

Graduate path from the YouTube Hobby Bot 4-primitive teach to a working local potato avatar demo with live replies.

## North star

- Keep the 4-primitive tap underneath (`openSession` / `ingestAudioChunk` / `emitAvatarBlock` / `assertContinuous`) — no LLM in the tap
- Local browser demo (static host OK): mic or fixture → visible Tater
- Live replies via GPT-Live (server-only `OPENAI_API_KEY`); caller audio not ingested — reply PCM only
- Recorded demo artifact; reply-driven artifact still optional later

## How we track work

- **Phases + intent:** this file.
- **Active phase only:** one GitHub Issue labeled `ready-for-agent` (NOW).
- No Linear for YouTube Hobby.

## Phase board

| Item | Title | Status |
|------|--------|--------|
| PR #1 | Four-primitive teach tap | done |
| PR #4 / #2 | Potato demo (canvas + artifact) | done |
| PR #5 | Live GPT-Live replies (conversation slice) | done |
| later | Browser WebRTC full-duplex | queued |
| later | Reply-driven recorded demo artifact | queued |

## NOW

_None._ Builder idle until CoS locks next NOW with Perk.

## Kill / park

Park if no workable avatar path, or overlaps another avatar product.

## Constraints (do not regress)

- Node `>=22.6.0`; `tsc` then `node --experimental-strip-types --test`
- Live: `gpt-live-1` / backend `gpt-5.6-terra` / voice `marin` (env overrides OK)
- `OPENAI_API_KEY` runtime secret server-only — never git/browser/`environment.json`
- `fixture.wav` = RMS lip tests; Play fixture uses `speech-fixture.wav`
