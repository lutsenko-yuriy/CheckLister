import type { Translations } from './en';

// German. `common.appName` intentionally stays "CheckLister" — see
// docs/knowledge/decisions/ADR-0003 / ticket #80 plan amendment 2.
export const de: Translations = {
  common: {
    appName: 'CheckLister',
    itemCount: { one: '{{count}} Eintrag', other: '{{count}} Einträge' },
    cancel: 'Abbrechen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    add: 'Hinzufügen',
    back: 'Zurück',
    rename: 'Umbenennen',
    runHistory: 'Verlauf',
  },
  errors: {
    invalidCallback:
      'Wir wissen nicht, zu welcher App wir zurückkehren sollen.',
    callbackDeliveryFailed:
      'Das Ergebnis konnte nicht an die aufrufende App übermittelt werden.',
  },
  nav: {
    selectChecklistTitle: 'Checkliste auswählen',
  },
  home: {
    newChecklistPlaceholder: 'Neue Checkliste',
    emptyState: 'Noch keine Checklisten.',
    deleteConfirmTitle: 'Checkliste löschen?',
    deleteConfirmBody:
      'Dadurch werden alle zugehörigen Einträge gelöscht. Dies kann nicht rückgängig gemacht werden.',
  },
  checklistDetail: {
    fallbackTitle: 'Checkliste',
    notFound: 'Checkliste nicht gefunden.',
    newItemPlaceholder: 'Neuer Eintrag',
    startRun: 'Durchlauf starten',
    emptyState: 'Noch keine Einträge.',
  },
  run: {
    fallbackTitle: 'Durchlauf',
    noActiveRun: 'Kein aktiver Durchlauf.',
    progress: '{{checked}} von {{total}} erledigt',
    externalWarning:
      'Von einer anderen App gestartet. Beenden oder Abbrechen bringt dich zu dieser App zurück.',
    completeButton: 'Checkliste abschließen',
    discardTitle: 'Bist du sicher?',
    discardBody:
      'Wenn du jetzt gehst, wird dieser Durchlauf verworfen. Dein Fortschritt wird nicht gespeichert.',
    discardConfirm: 'Verwerfen',
    completeFailedTitle: 'Durchlauf konnte nicht abgeschlossen werden',
    completeFailedBody:
      'Dieser Durchlauf wurde nicht gespeichert. Bitte versuche es erneut.',
  },
  runHistory: {
    checklistTitle: 'Verlauf: {{title}}',
    emptyState: 'Noch keine abgeschlossenen Durchläufe.',
    row: {
      one: '{{count}} Eintrag • Durchlauf am {{date}}',
      other: '{{count}} Einträge • Durchlauf am {{date}}',
    },
  },
};
