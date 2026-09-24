# Integration Report

## Automated spike completed

`tests/spike.test.ts` uses the confirmed API order and simulates a host restart:
it writes `2026-09-24` and `2026-09-23` through separate keys, creates a new
adapter instance, and reads both values independently. The test passes.

Automated checks currently pass:

- `npm test`: 10 tests passed
- `npm run typecheck`: passed

## Required manual run

Run with a clean SP `19.1.0` profile and the generated ZIP:

1. Install with **Settings > Plugins > Choose Plugin File**.
2. Open Journal, edit today and yesterday, close/reopen the view, and restart SP.
3. Configure the same native sync backend on devices A and B.
4. Write day X on A, run a complete sync, then read X on B.
5. Edit X and Y independently on A/B, sync both, and observe each key.
6. Edit the same day concurrently and verify the conflict actions preserve both texts.
7. Disconnect the network, write, reconnect, sync, and inspect the error/retry path.
8. Exercise one year of scrolling, long Markdown, resize, empty days, and DST.

This workspace does not contain an SP `19.1.0` application profile or sync
backend credentials, so these manual A/B claims are intentionally not marked as
passed. No instant cross-device synchronization guarantee is made.
