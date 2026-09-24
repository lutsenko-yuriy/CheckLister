/**
 * A plural entry: one form per CLDR category the language uses. `other` is
 * mandatory and is the fallback for any category a language leaves out, so
 * `other` is reserved for plural entries and must not name a key group.
 */
export interface PluralForms {
  readonly one?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

interface TranslationTree {
  readonly [key: string]: string | PluralForms | TranslationTree;
}

// English is the source locale. #80 WU2 extracts every UI string into this
// object; de/fr/ru are added in WU3.
const enStrings = {
  common: {
    appName: 'CheckLister',
    itemCount: { one: '{{count}} item', other: '{{count}} items' },
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    back: 'Back',
    rename: 'Rename',
    runHistory: 'Run history',
  },
  errors: {
    invalidCallback: 'We do not know which app to return to.',
    callbackDeliveryFailed: 'Could not return the result to the calling app.',
  },
  nav: {
    selectChecklistTitle: 'Select checklist',
  },
  home: {
    newChecklistPlaceholder: 'New checklist title',
    emptyState: 'No checklists yet.',
    deleteConfirmTitle: 'Delete checklist?',
    deleteConfirmBody:
      'This will delete all of its items. This cannot be undone.',
  },
  checklistDetail: {
    fallbackTitle: 'Checklist',
    notFound: 'Checklist not found.',
    newItemPlaceholder: 'New item',
    startRun: 'Start run',
    emptyState: 'No items yet.',
  },
  run: {
    fallbackTitle: 'Run',
    noActiveRun: 'No active run.',
    progress: '{{checked}} of {{total}} checked',
    externalWarning:
      'Started by another app. Finishing or cancelling returns you to that app.',
    completeButton: 'Complete the checklist',
    discardTitle: 'Are you sure?',
    discardBody:
      'Leaving now will discard this run. Your progress will not be saved.',
    discardConfirm: 'Discard',
    completeFailedTitle: 'Could not complete run',
    completeFailedBody: 'This run has not been saved. Please try again.',
  },
  runHistory: {
    checklistTitle: '{{title}} history',
    emptyState: 'No completed runs yet.',
    row: {
      one: '{{count}} item • Run on {{date}}',
      other: '{{count}} items • Run on {{date}}',
    },
  },
} satisfies TranslationTree;

/*
 * The shape every other locale is typed against: string leaves widen to
 * `string` and plural leaves to `PluralForms`, so de/fr/ru must provide
 * exactly the same keys (missing or extra keys fail typecheck) while choosing
 * the plural categories their own language needs.
 */
type Widen<T> = T extends string
  ? string
  : T extends { other: string }
  ? PluralForms
  : { readonly [K in keyof T]: Widen<T[K]> };

export type Translations = Widen<typeof enStrings>;

export const en: Translations = enStrings;
