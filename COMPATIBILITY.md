# Compatibility: Super Productivity 19.1.0

Source inspected: Super Productivity tag `v19.1.0`, commit
`42ded9f31a132bf92633b0c78ad4ebf1d87c0f71`.

## Confirmed API

The authoritative source type is `packages/plugin-api/src/types.ts`:

```ts
persistDataSynced(dataStr: string, key?: string): Promise<void>;
loadSyncedData(key?: string): Promise<string | null>;
registerHook<T extends Hooks>(hook: T, fn: PluginHookHandler<T>): void;
```

The `PluginHooks.PERSISTED_DATA_CHANGED` value is
`'persistedDataChanged'`. Its payload is `void`. The host dispatches it after
initial boot and for local writes, remote sync deliveries, bulk imports, and
other persisted-data changes. It does not identify a key or guarantee order;
the adapter therefore re-reads loaded keys.

The iframe bridge forwards the calls as:

```ts
persistDataSynced: (data, key) => callApi('persistDataSynced', [data, key]);
loadSyncedData: (key) => callApi('loadPersistedData', [key]);
```

An iframe plugin with `iFrame: true` and `sidePanel: false` receives an
automatically registered menu entry that calls `showIndexHtmlAsView()`. The
loader enforces a 100 KiB `index.html` limit and a 5 MiB `plugin.js` limit.
Because arbitrary ZIP assets are not a portable runtime contract, the delivered
HTML is a small shell and the CodeMirror runtime is bundled in `plugin.js`.
The shell invokes the host plugin's runtime through the documented same-origin
iframe relationship, passing the iframe's `window` so CodeMirror mounts in the
iframe document.

## Confirmed host behavior

- Keyed entries are composed as `pluginId:key`; empty key means the legacy entry.
- The colon is reserved as the plugin ID/key delimiter.
- Maximum persistence key length is 256 characters.
- Maximum uncompressed payload per entry is `256 * 1024` bytes.
- Persistence writes are rate-limited/coalesced per entity with a 1000 ms minimum interval.
- The host compresses persisted values internally; the plugin reads/writes plain strings.
- Persistence is LWW per entity. The API is not compare-and-swap and exposes no
  server acknowledgement or remote ordering to the plugin.

## Package mismatch

The published npm package `@super-productivity/plugin-api@1.0.1` does not yet
declare the keyed methods used by the `19.1.0` source checkout and also has an
older iframe surface. The plugin intentionally uses the small local
`src/plugin-api.ts` contract for these confirmed runtime methods rather than
casting the old package types across the whole implementation. The package is
retained as a development reference dependency.

## Not verified in this workspace

- Installation in a running SP `19.1.0` desktop or web binary.
- Two physical devices using a configured native sync backend.
- Offline/reconnect behavior against a real backend.
- Mobile plugin runtime or native ZIP range download behavior.
- CodeMirror runtime mounting through the cross-window root on a packaged SP
  build (the build uses the official `EditorView` `root` option).
- The exact practical size of a sync server operation beyond the host's local
  256 KiB payload guard.

The Plugin API has no global-search registration or official listing of keyed
plugin entries. Journal's compact search menu therefore searches plain text in
loaded days only; it does not claim to index unloaded history.

The shortcut is registered from host-side `plugin.js` using
`registerShortcut({ id, label, onExec })` and opens the iframe with
`showIndexHtmlAsView()`. These callback-heavy methods are not available through
the iframe bridge.

## Removal behavior

Super Productivity 19.1.0 calls `removePluginUserData(pluginId)` while removing
an uploaded plugin. That service deletes the legacy entry and every keyed entry
whose ID starts with `pluginId:` and emits synced delete operations. Re-uploading
the same plugin ID or disabling the plugin does not perform that purge; removing
the plugin is destructive by host design. The Plugin API has no uninstall hook,
so Journal cannot intercept removal or recover deleted entries. Export before
removal.
