# Journal Markdown

A calm, date-based journal for [Super Productivity](https://super-productivity.com).
Write one Markdown note per day, keep a continuous history, and let the native
Super Productivity sync carry your journal between compatible installations.

## What You Get

- Today-first journal stream with older days loaded as you scroll
- Live Markdown rendering for headings, lists, links, emphasis, quotes, and code
- One-click editing with CodeMirror 6 and normal keyboard editing
- Date picker, Today button, and keyboard shortcut support
- Offline writing with per-day save status, retry, and conflict recovery
- Export one day as `YYYY-MM-DD.md` or an explicit date range as a ZIP
- Light/dark theme support through the Super Productivity UI variables
- No server, account, telemetry, CDN, or external network dependency

## Install

1. Download the latest ZIP from [Releases](https://github.com/giba0/sp-journal-plugin/releases).
2. Open Super Productivity and go to **Settings > Plugins**.
3. Choose **Load Plugin from File** and select the downloaded ZIP.
4. Enable Journal Markdown if Super Productivity does not enable it automatically.
5. Open Journal from the plugin menu.

The plugin ID is `sp-journal-markdown`. Keep this ID unchanged when upgrading;
it is the address used for your stored notes.

## First Use

The current day is opened automatically. Click the empty note area to start
writing, or click an existing rendered note to edit it. Click outside the
editor to return to the rendered view. Markdown remains the source text; the
rendered view is never stored instead of your Markdown.

```markdown
## Today

- First thought
- [ ] Follow-up task

Read **what matters** and [open a reference](https://example.com).
```

Use **Go** to jump to a civil date and **Today** to return to the current day.
The **Search** menu searches text in days already loaded into the journal. Load
more days before searching older notes.

## Sync And Safety

Journal stores each day independently through the official keyed Plugin API:

`journal/v1/day/YYYY-MM-DD`

Configure the native Super Productivity sync backend on each installation and
complete a sync operation before expecting another device to see a note. Sync
is not promised to be instant.

If two devices edit the same day concurrently, Journal shows a conflict instead
of silently replacing the local text. The two versions can be kept, replaced,
or copied for recovery. Super Productivity persistence is not compare-and-swap,
so simultaneous same-day editing can still be last-write-wins after a confirmed
save. Avoid editing the same day on two devices at once.

### Important Plugin Management Note

- Re-uploading a newer ZIP with the same ID preserves notes.
- Disabling the plugin preserves notes.
- **Remove/Uninstall** deliberately deletes the plugin's persisted data in SP.
- **Clear Plugin Cache** removes uploaded plugin code from the active cache; reinstall the same ZIP afterward.

Export important notes before removing the plugin. The plugin also keeps a
same-profile local recovery copy when the browser runtime allows it, but that
copy is not synced and is not a substitute for export.

## Export

**Export day** downloads the exact Markdown text as UTF-8. **Export range**
creates a ZIP containing only non-empty days in the chosen interval. Journal
does not offer an export-all button because the Plugin API has no official way
to list every persisted key.

## Keyboard Shortcut

The plugin registers **Open Journal** with Super Productivity. Assign the key
combination in **Settings > Keyboard > Plugin Shortcuts**. The plugin does not
force a global key that could conflict with your setup. When triggered, it opens
today's note in edit mode with the cursor at the end, ready for typing.

## Compatibility

- Super Productivity `19.1.0` or newer
- Desktop and web runtimes where iframe plugins are available
- Mobile support has not been validated

The plugin uses keyed `persistDataSynced`, keyed `loadSyncedData`, and the
`PERSISTED_DATA_CHANGED` hook. See [`COMPATIBILITY.md`](COMPATIBILITY.md) for
the confirmed host behavior and known limitations.

## Build From Source

Requirements: Node.js 18+ and npm.

```bash
npm install
npm test
npm run typecheck
npm run build
```

The build creates `dist/sp-journal-markdown-<version>.zip`. The archive is
self-contained and includes the manifest, icon, iframe shell, and bundled
runtime. The build also enforces Super Productivity's `index.html` and
`plugin.js` size limits.

## Contributing

Issues and pull requests are welcome at
https://github.com/giba0/sp-journal-plugin.

Before opening a pull request:

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run build` and install the generated ZIP in Super Productivity.
4. Test writing, reload/restart, offline saves, export, conflicts, and date navigation.
5. Never change the plugin ID or rewrite published release tags.

Releases are created by GitHub Actions when a `v*` tag is pushed. The workflow
runs tests, typechecks the source, builds the ZIP, and attaches it to the GitHub
Release.

## Project Notes

The full API compatibility record is in [`COMPATIBILITY.md`](COMPATIBILITY.md).
The manual integration checklist and current verification limits are in
[`INTEGRATION-REPORT.md`](INTEGRATION-REPORT.md).
