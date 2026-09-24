import type { Translations } from './en';

// French. `common.appName` intentionally stays "CheckLister" — see
// docs/knowledge/decisions/ADR-0003 / ticket #80 plan amendment 2.
export const fr: Translations = {
  common: {
    appName: 'CheckLister',
    itemCount: { one: '{{count}} élément', other: '{{count}} éléments' },
    cancel: 'Annuler',
    save: 'Enregistrer',
    edit: 'Modifier',
    delete: 'Supprimer',
    add: 'Ajouter',
    back: 'Retour',
    rename: 'Renommer',
    runHistory: 'Historique',
  },
  errors: {
    invalidCallback: 'Nous ne savons pas à quelle application revenir.',
    callbackDeliveryFailed:
      "Impossible de renvoyer le résultat à l'application appelante.",
  },
  nav: {
    selectChecklistTitle: 'Choisir une checklist',
  },
  home: {
    newChecklistPlaceholder: 'Nouvelle checklist',
    emptyState: 'Aucune checklist pour le moment.',
    deleteConfirmTitle: 'Supprimer la checklist ?',
    deleteConfirmBody:
      'Tous ses éléments seront supprimés. Cette action est irréversible.',
  },
  checklistDetail: {
    fallbackTitle: 'Liste de contrôle',
    notFound: 'Checklist introuvable.',
    newItemPlaceholder: 'Nouvel élément',
    startRun: 'Démarrer',
    emptyState: 'Aucun élément pour le moment.',
  },
  run: {
    fallbackTitle: 'Session',
    noActiveRun: 'Aucune session en cours.',
    progress: '{{checked}} sur {{total}} cochés',
    externalWarning:
      'Démarré depuis une autre application. Terminer ou annuler vous y ramènera.',
    completeButton: 'Terminer la checklist',
    discardTitle: 'Êtes-vous sûr ?',
    discardBody:
      'Si vous quittez maintenant, cette session sera abandonnée. Votre progression ne sera pas enregistrée.',
    discardConfirm: 'Abandonner',
    completeFailedTitle: 'Impossible de terminer la session',
    completeFailedBody:
      "Cette session n'a pas été enregistrée. Veuillez réessayer.",
  },
  runHistory: {
    checklistTitle: 'Historique : {{title}}',
    emptyState: 'Aucune session terminée pour le moment.',
    row: {
      one: '{{count}} élément • Session du {{date}}',
      other: '{{count}} éléments • Session du {{date}}',
    },
  },
};
