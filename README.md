# Fan Chat + Paywall

Mobile chat experience with a gated paywall, built with Expo, React Native, and TypeScript.

Messages go against a mock backend that behaves like a real, imperfect network — retries, delays, offline periods — instead of a happy-path mock. The mock server deduplicates retried sends via a stable, client-generated ID, so a retry after a dropped connection doesn't create a duplicate message. Chat and paywall state persist across app restarts and offline periods. The paywall simulates a purchase with a delayed backend confirmation, so the UI actually has to handle pending/failure states instead of assuming success.

## Setup

\`\`\`bash
npm install
npm start
\`\`\`

Tests: \`npm test\` (15 passing)

## Why dedup by client ID

The client can't reliably know whether a previous request landed if its response was lost during a retry, so the dedup key has to be something the client owns — not something it waits on the server to hand back.

## Bugs found along the way

A storage race condition affecting persisted state, and an object-aliasing bug that corrupted default values via a shared object reference. Both found and fixed during manual review — see [AI.md](./AI.md) for the full note on what was AI-drafted vs. hand-fixed.

Real-device performance, pixel-accurate Figma styling, and Android-specific behavior haven't been verified yet.
