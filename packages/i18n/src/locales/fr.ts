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
  analyticsConsent: {
    title: 'Aider à améliorer CheckLister ?',
    body: "Partagez des données d'utilisation anonymes avec notre fournisseur d'analyses afin que nous puissions corriger et améliorer l'application. Vous pourrez modifier ce choix plus tard dans les Réglages.",
    allow: 'Autoriser',
    deny: 'Ne pas autoriser',
  },
  settings: {
    title: 'Réglages',
    open: 'Ouvrir les réglages',
    analyticsToggle: "Partager des données d'utilisation anonymes",
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
  photos: {
    addTitle: 'Ajouter une photo',
    takePhoto: 'Prendre une photo',
    chooseFromLibrary: 'Choisir dans la photothèque',
    addToItem: 'Ajouter une photo à {{item}}',
    addToRun: 'Ajouter une photo à cette session',
    runTitle: 'Photos',
    open: 'Ouvrir la photo',
    close: 'Fermer',
    remove: 'Supprimer',
    removeTitle: 'Supprimer la photo ?',
    removeBody: 'Cette action est irréversible.',
    deniedTitle: "L'accès aux photos est désactivé",
    deniedBody:
      "CheckLister a besoin d'accéder à l'appareil photo pour prendre des photos. Vous pouvez l'activer dans les Réglages.",
    openSettings: 'Ouvrir les Réglages',
    unavailableTitle: 'Appareil photo indisponible',
    unavailableBody:
      "Cet appareil n'a pas d'appareil photo utilisable par CheckLister. Vous pouvez choisir une photo dans la photothèque à la place.",
    failedTitle: "Impossible d'ajouter la photo",
    failedBody:
      "Une erreur s'est produite lors de l'enregistrement de la photo. Veuillez réessayer.",
  },
  runDetail: {
    title: 'Détails de la session',
    notRecorded: "Les détails n'ont pas été enregistrés pour cette session.",
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
