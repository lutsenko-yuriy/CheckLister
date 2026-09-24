// Scenario stubs for #80 (WU0). `implement` turns each `it.todo` into a real test
// that performs the TODO steps above it.

describe('ExternalLinkCoordinator localization (#80)', () => {
  // TODO:
  // 1. Mock preferred locales as [ru-RU]; spy on Alert.alert.
  // 2. Render ExternalLinkCoordinator inside I18nProvider and dispatch
  //    checklister://select?callbackUrl=not-a-url.
  // 3. Verify Alert.alert receives the `ru` invalid-callback message.
  // 4. Verify no picker was opened.
  it.todo('shows the invalid-callback alert in Russian');

  // TODO:
  // 1. Mock preferred locales as [de-DE]; make Linking.openURL reject.
  // 2. Start and complete an external run.
  // 3. Verify the alert shows the `de` delivery-failure message.
  it.todo('shows the callback delivery failure message in German');

  // TODO:
  // 1. For each of en, de, fr, ru: mock preferred locales accordingly.
  // 2. Complete an external run of "Groceries" and record the URL passed to Linking.openURL.
  // 3. Separately select "Groceries" through an external select request and record that URL.
  // 4. Verify the recorded URLs are identical across all four languages
  //    (same status, checklistId, runId and untranslated name).
  it.todo('returns identical callback URLs regardless of UI language');
});
