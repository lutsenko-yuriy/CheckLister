// Scenario stubs for #80 (WU0). `implement` turns each `it.todo` into a real test
// that performs the TODO steps above it.

describe('HomeScreen localization (#80)', () => {
  // TODO:
  // 1. Mock react-native-localize preferred locales as [de-DE].
  // 2. Seed a checklist titled "Groceries" with 7 items.
  // 3. Render HomeScreen inside I18nProvider.
  // 4. Verify the new-checklist placeholder and the Add button label equal the `de` translations.
  // 5. Verify the row title is exactly "Groceries" (user content is never translated).
  // 6. Verify the row subtitle equals the `de` `common.itemCount` value for 7.
  it.todo(
    'renders home screen text in German and keeps checklist titles verbatim',
  );

  // TODO:
  // 1. Mock preferred locales as [ru-RU].
  // 2. Seed checklists with 1, 2, 5, 11 and 21 items.
  // 3. Render HomeScreen inside I18nProvider.
  // 4. Verify each subtitle uses the `ru` plural form for its count:
  //    one for 1 and 21, few for 2, many for 5 and 11.
  it.todo('uses Russian one/few/many plural forms for item counts');

  // TODO:
  // 1. Mock preferred locales as [ja-JP, fr-FR]; render HomeScreen inside I18nProvider.
  // 2. Verify the new-checklist placeholder is the `fr` value (first supported language wins).
  // 3. Re-render with preferred locales [ja-JP, pt-BR].
  // 4. Verify the placeholder is "New checklist title" (no supported language → English).
  it.todo('walks the preferred-language list and falls back to English');

  // TODO:
  // 1. Mock preferred locales as [fr-FR]; seed a checklist titled "Groceries".
  // 2. Spy on Alert.alert; render HomeScreen inside I18nProvider.
  // 3. Tap the Delete action on the "Groceries" row.
  // 4. Verify the alert title, body and buttons use `fr` values.
  // 5. Verify the body contains "Groceries" unchanged.
  it.todo('localizes the delete confirmation and inserts the title verbatim');
});
