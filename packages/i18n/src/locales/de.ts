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
  analyticsConsent: {
    title: 'Hilf mit, CheckLister zu verbessern?',
    body: 'Teile anonyme Nutzungsdaten mit unserem Analyse-Anbieter, damit wir die App korrigieren und verbessern können. Du kannst dies später in den Einstellungen ändern.',
    allow: 'Erlauben',
    deny: 'Nicht erlauben',
  },
  settings: {
    title: 'Einstellungen',
    open: 'Einstellungen öffnen',
    analyticsToggle: 'Anonyme Nutzungsdaten teilen',
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
  photos: {
    addTitle: 'Foto hinzufügen',
    takePhoto: 'Foto aufnehmen',
    chooseFromLibrary: 'Aus der Mediathek wählen',
    addToItem: 'Foto zu {{item}} hinzufügen',
    addToRun: 'Foto zu diesem Durchlauf hinzufügen',
    runTitle: 'Fotos',
    open: 'Foto öffnen',
    close: 'Schließen',
    remove: 'Entfernen',
    removeTitle: 'Foto entfernen?',
    removeBody: 'Das lässt sich nicht rückgängig machen.',
    deniedTitle: 'Fotozugriff ist ausgeschaltet',
    deniedBody:
      'CheckLister braucht Zugriff auf die Kamera, um Fotos aufzunehmen. Du kannst ihn in den Einstellungen einschalten.',
    openSettings: 'Einstellungen öffnen',
    unavailableTitle: 'Kamera nicht verfügbar',
    unavailableBody:
      'Dieses Gerät hat keine Kamera, die CheckLister verwenden kann. Du kannst stattdessen ein Foto aus der Mediathek wählen.',
    failedTitle: 'Foto konnte nicht hinzugefügt werden',
    failedBody:
      'Beim Speichern des Fotos ist etwas schiefgelaufen. Bitte versuche es erneut.',
  },
  runDetail: {
    title: 'Details zum Durchlauf',
    notRecorded: 'Für diesen Durchlauf wurden keine Details aufgezeichnet.',
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
