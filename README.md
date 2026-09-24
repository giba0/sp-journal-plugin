# Journal Markdown for Super Productivity

An English-language Markdown journal plugin for Super Productivity. Each civil
local day is stored as one independently synced Plugin API entry. The editor is
CodeMirror 6 with a live rendered Markdown preview; the application has no
server, network request, external account, or CDN dependency.

## Compatibility

- Target tested by source inspection: Super Productivity `19.1.0`, tag commit `42ded9f31a132bf92633b0c78ad4ebf1d87c0f71`.
- Required runtime features: iframe plugins, keyed `persistDataSynced(data, key?)`, keyed `loadSyncedData(key?)`, and `PERSISTED_DATA_CHANGED`.
- See [`COMPATIBILITY.md`](COMPATIBILITY.md) for the confirmed signatures, limits, and known gaps.

## Build

Requirements: Node.js 18+ and npm.

```bash
npm install
npm test
npm run typecheck
npm run build
```

The build writes `dist/index.html`, `dist/plugin.js`, `dist/manifest.json`, and
the installable `dist/sp-journal-markdown-1.0.0.zip`. The iframe shell stays
below Super Productivity's 100 KiB `index.html` limit; CodeMirror and JSZip are
bundled locally in `plugin.js`, which stays below the host's 5 MiB code limit.
The build fails if either host limit is exceeded.

## Install

In Super Productivity, open **Settings > Plugins > Choose Plugin File** and
select the generated ZIP. The host registers the Journal menu entry because the
manifest sets `iFrame: true` and `sidePanel: false`. Keep the plugin ID
`sp-journal-markdown` unchanged when upgrading, otherwise stored notes are no
longer addressable.

The host registers **Open Journal** as a keyboard shortcut. Assign its key
combination under **Settings > Keyboard**; the plugin does not choose a key.

Do **not** use **Remove/Uninstall** as an upgrade operation. Super Productivity
19.1.0 deliberately deletes every persisted entry owned by a removed plugin,
including all keyed journal days; the Plugin API provides no uninstall hook and
cannot restore those entries after removal. To upgrade, re-upload the ZIP with
the same plugin ID or disable the plugin. If removal is intentional, export the
needed days or range first.

Configure the native Super Productivity sync backend separately on each
installation and complete a sync operation before expecting another device to
see a note. The plugin does not claim instant propagation.

## Storage and reliability

The storage key is `journal/v1/day/YYYY-MM-DD`. The value is canonical JSON;
Markdown is the source of truth. Writes are debounced for 600 ms and serialized
per day. The host currently validates one persistence payload at 256 KiB and
coalesces writes within a one-second per-key window; this plugin does not rely
on a larger payload.

`PERSISTED_DATA_CHANGED` has no key or ordering guarantee. The plugin re-reads
loaded days and ignores identical revisions. Dirty local text is never replaced
by a different remote revision: it enters a conflict state with actions to keep
the local version, use the received version, or copy both. This is not a CAS;
Super Productivity can still accept concurrent last-write-wins writes between
devices after a local save. Avoid editing the same day concurrently.

## Offline mode and recovery

Local Plugin API persistence works without network. A rejected write remains in
memory as dirty text and exposes Retry. Recovery is deliberately session-local;
the sync backend only transports confirmed writes. Closing the iframe is not a
backup mechanism.

## Export

**Export day** flushes the selected day and uses a local Blob download to write
an exact UTF-8 `YYYY-MM-DD.md` file. **Export range** reads the civil date range
and downloads a ZIP containing non-empty days only. It is an explicit range
export, not an "export all" operation; there is no official key listing API.

## Search

The Super Productivity API does not expose a way to add plugin content to the
global search. Journal provides a compact local text search in the **Search**
menu. It matches case-insensitively across loaded days; use **Load more days**
before searching older notes.

## Tests

Unit tests cover civil dates (including leap boundaries), schema validation,
two-key persistence across a simulated restart, debounce/latest-generation
saves, retry, and remote conflicts. The real two-device sync test is not
claimed here because this workspace has no configured SP `19.1.0` application or
sync backend credentials. [`INTEGRATION-REPORT.md`](INTEGRATION-REPORT.md)
records the exact manual procedure and this limitation.

## Permissions

Only synced persistence, its change hook, and snack feedback are declared. No
HTTP, node execution, filesystem, or secret-storage permission is requested.
