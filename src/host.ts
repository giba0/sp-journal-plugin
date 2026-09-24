import { boot, type JournalWindow } from './main';
import type { JournalHostPluginAPI } from './plugin-api';

declare global {
  interface Window {
    __spJournalBoot?: (targetWindow: JournalWindow) => void;
  }
}

window.__spJournalBoot = (targetWindow) => boot(targetWindow);

const pluginApi = window.PluginAPI as unknown as JournalHostPluginAPI;
pluginApi.registerShortcut({
  id: 'open-journal',
  label: 'Open Journal',
  onExec: () => pluginApi.showIndexHtmlAsView(),
});
