import { boot, type JournalWindow } from './main';
import type { JournalHostPluginAPI } from './plugin-api';

declare const PluginAPI: JournalHostPluginAPI;

declare global {
  interface Window {
    __spJournalBoot?: (targetWindow: JournalWindow) => void;
    __spJournalFocusToday?: () => Promise<void>;
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
        void window.__spJournalFocusToday();
        return;
      }
      if (attempts++ < 200) window.setTimeout(focusToday, 50);
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
    let submitted = false;
    const submit = () => {
      if (submitted) return;
      submitted = true;
      const text = (document.getElementById(inputId) as HTMLTextAreaElement | null)?.value ?? '';
      document.removeEventListener('keydown', onKeyDown, true);
      let attempts = 0;
      const addNote = () => {
        if (window.__spJournalAddQuickNote) {
          window.__spJournalAddQuickNote(text);
          return;
        }
        if (attempts++ < 20) window.setTimeout(addNote, 25);
      };
      addNote();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        clickDialogButton('Add note', submit);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        clickDialogButton('Cancel', () => undefined);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    void pluginApi.openDialog({
      title: 'Quick Journal Note',
      htmlContent: `<textarea id="${inputId}" rows="8" autofocus placeholder="Write a note for today..." style="display:block;width:100%;min-width:28rem;min-height:10rem;box-sizing:border-box;resize:vertical;padding:.75rem;line-height:1.5;font:inherit;"></textarea>`,
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Add note',
          color: 'primary',
          raised: true,
          onClick: submit,
        },
      ],
    }).finally(() => document.removeEventListener('keydown', onKeyDown, true));
    window.setTimeout(() => (document.getElementById(inputId) as HTMLTextAreaElement | null)?.focus(), 0);
  },
});

function clickDialogButton(label: string, fallback: () => void): void {
  const button = [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (button) button.click();
  else fallback();
}
