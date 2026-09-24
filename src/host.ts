import { boot, type JournalWindow } from './main';
import type { JournalHostPluginAPI } from './plugin-api';

declare const PluginAPI: JournalHostPluginAPI;

declare global {
  interface Window {
    __spJournalBoot?: (targetWindow: JournalWindow) => void;
    __spJournalFocusToday?: () => void;
  }
}

window.__spJournalBoot = (targetWindow) => boot(targetWindow);

const pluginApi = PluginAPI;
pluginApi.registerShortcut({
  id: 'open-journal',
  label: 'Open Journal',
  onExec: () => {
    pluginApi.showIndexHtmlAsView();
    let attempts = 0;
    const focusToday = () => {
      if (window.__spJournalFocusToday) {
        window.__spJournalFocusToday();
        return;
      }
      if (attempts++ < 20) window.setTimeout(focusToday, 25);
    };
    focusToday();
  },
});
