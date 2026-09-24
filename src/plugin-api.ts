/**
 * Runtime contract confirmed in Super Productivity 19.1.0.
 * The published npm typings 1.0.1 predate keyed persistence, so this small
 * local surface keeps the plugin build honest and limits API usage.
 */
export interface JournalPluginAPI {
  readonly Hooks: { readonly PERSISTED_DATA_CHANGED: string };
  persistDataSynced(data: string, key?: string): Promise<void>;
  loadSyncedData(key?: string): Promise<string | null>;
  registerHook(hook: string, listener: () => void | Promise<void>): void;
  showSnack(config: { msg: string; type?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' }): void;
}

export interface JournalHostPluginAPI extends JournalPluginAPI {
  showIndexHtmlAsView(): void;
  openDialog(config: {
    title?: string;
    htmlContent?: string;
    buttons?: Array<{ label: string; color?: 'primary' | 'warn'; raised?: boolean; onClick?: () => void | Promise<void> }>;
  }): Promise<string | undefined>;
  registerShortcut(config: {
    id: string;
    label: string;
    onExec: () => void;
  }): void;
}
