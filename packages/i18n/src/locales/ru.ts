import type { Translations } from './en';

// Russian. `common.appName` is transliterated ("ЧекЛистер") — see
// docs/knowledge/decisions/ADR-0003 / ticket #80 plan amendment 2; the
// native display-name declarations that show this on-device land in WU4.
export const ru: Translations = {
  common: {
    appName: 'ЧекЛистер',
    itemCount: {
      one: '{{count}} пункт',
      few: '{{count}} пункта',
      many: '{{count}} пунктов',
      other: '{{count}} пункта',
    },
    cancel: 'Отмена',
    save: 'Сохранить',
    edit: 'Изменить',
    delete: 'Удалить',
    add: 'Добавить',
    back: 'Назад',
    rename: 'Переименовать',
    runHistory: 'История',
  },
  errors: {
    invalidCallback: 'Мы не знаем, в какое приложение вернуться.',
    callbackDeliveryFailed:
      'Не удалось вернуть результат в вызвавшее приложение.',
  },
  analyticsConsent: {
    title: 'Помочь улучшить CheckLister?',
    body: 'Разрешить передачу анонимных данных об использовании нашему провайдеру аналитики, чтобы мы могли исправлять и улучшать приложение. Это можно изменить позже в настройках.',
    allow: 'Разрешить',
    deny: 'Не разрешать',
  },
  settings: {
    title: 'Настройки',
    open: 'Открыть настройки',
    analyticsToggle: 'Делиться анонимными данными об использовании',
  },
  nav: {
    selectChecklistTitle: 'Выбор чек-листа',
  },
  home: {
    newChecklistPlaceholder: 'Новый чек-лист',
    emptyState: 'Чек-листов пока нет.',
    deleteConfirmTitle: 'Удалить чек-лист?',
    deleteConfirmBody:
      'Все его пункты будут удалены. Это действие нельзя отменить.',
  },
  checklistDetail: {
    fallbackTitle: 'Чек-лист',
    notFound: 'Чек-лист не найден.',
    newItemPlaceholder: 'Новый пункт',
    startRun: 'Начать выполнение',
    emptyState: 'Пунктов пока нет.',
  },
  run: {
    fallbackTitle: 'Выполнение',
    noActiveRun: 'Нет активного выполнения.',
    progress: 'Отмечено {{checked}} из {{total}}',
    externalWarning:
      'Запущено из другого приложения. Завершение или отмена вернёт вас в него.',
    completeButton: 'Завершить чек-лист',
    discardTitle: 'Вы уверены?',
    discardBody:
      'Если вы уйдёте сейчас, это выполнение будет отменено. Прогресс не сохранится.',
    discardConfirm: 'Отменить',
    completeFailedTitle: 'Не удалось завершить выполнение',
    completeFailedBody: 'Это выполнение не было сохранено. Попробуйте ещё раз.',
  },
  photos: {
    addTitle: 'Добавить фото',
    takePhoto: 'Сделать фото',
    chooseFromLibrary: 'Выбрать из галереи',
    addToItem: 'Добавить фото к пункту {{item}}',
    addToRun: 'Добавить фото к этому выполнению',
    runTitle: 'Фото',
    open: 'Открыть фото',
    close: 'Закрыть',
    remove: 'Удалить',
    removeTitle: 'Удалить фото?',
    removeBody: 'Это действие нельзя отменить.',
    deniedTitle: 'Доступ к фото выключен',
    deniedBody:
      'CheckLister нужен доступ к камере, чтобы делать фото. Его можно включить в настройках.',
    openSettings: 'Открыть настройки',
    unavailableTitle: 'Камера недоступна',
    unavailableBody:
      'На этом устройстве нет камеры, которую может использовать CheckLister. Вместо этого можно выбрать фото из галереи.',
    failedTitle: 'Не удалось добавить фото',
    failedBody: 'При сохранении фото что-то пошло не так. Попробуйте ещё раз.',
  },
  runDetail: {
    title: 'Детали выполнения',
    notRecorded: 'Подробности этого выполнения не сохранены.',
  },
  runHistory: {
    checklistTitle: 'История: {{title}}',
    emptyState: 'Завершённых выполнений пока нет.',
    row: {
      one: '{{count}} пункт • выполнено {{date}}',
      few: '{{count}} пункта • выполнено {{date}}',
      many: '{{count}} пунктов • выполнено {{date}}',
      other: '{{count}} пунктов • выполнено {{date}}',
    },
  },
};
