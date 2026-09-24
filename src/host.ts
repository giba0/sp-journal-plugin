import { boot, type JournalWindow } from './main';
import type { JournalHostPluginAPI } from './plugin-api';

declare const PluginAPI: JournalHostPluginAPI;

declare global {
  interface Window {
    __spJournalBoot?: (targetWindow: JournalWindow) => void;
    __spJournalFocusToday?: () => void;
    __spJournalAddQuickNote?: (text: string) => void;
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

pluginApi.registerShortcut({
  id: 'quick-journal-note',
  label: 'Quick Journal Note',
  onExec: () => {
    pluginApi.showIndexHtmlAsView();
    const inputId = 'sp-journal-quick-note-input';
    void pluginApi.openDialog({
      title: 'Quick Journal Note',
      htmlContent: `<textarea id="${inputId}" rows="6" autofocus placeholder="Write a note for today..."></textarea>`,
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Add note',
          color: 'primary',
          raised: true,
          onClick: () => {
            const text = (document.getElementById(inputId) as HTMLTextAreaElement | null)?.value ?? '';
            let attempts = 0;
            const addNote = () => {
              if (window.__spJournalAddQuickNote) {
                window.__spJournalAddQuickNote(text);
                return;
              }
              if (attempts++ < 20) window.setTimeout(addNote, 25);
            };
            addNote();
          },
        },
      ],
    });
  },
});
