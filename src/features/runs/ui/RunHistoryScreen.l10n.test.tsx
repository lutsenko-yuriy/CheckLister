// Scenario stubs for #80 (WU0). `implement` turns each `it.todo` into a real test
// that performs the TODO steps above it.

describe('RunHistoryScreen localization (#80)', () => {
  // TODO:
  // 1. Mock preferred locales as [de-DE] with country DE.
  // 2. Seed a history entry "Packing", 8 items, completed 2026-09-18T12:00:00.000Z (midday UTC, so the
  //    calendar date is the 18th in any UTC-11…UTC+11 test-machine time zone).
  // 3. Render the all-checklists history inside I18nProvider.
  // 4. Verify the row title is exactly "Packing".
  // 5. Verify the subtitle equals the `de` `runHistory.row` value built from the `de`
  //    plural for 8 and a de-DE formatted date (contains "18.09.2026").
  it.todo('formats history rows with German plurals and a German date');

  // TODO:
  // 1. Mock preferred locales as [fr-FR].
  // 2. Render the history filtered to checklist "Packing" inside I18nProvider.
  // 3. Verify the header title is the `fr` `runHistory.checklistTitle` with "Packing" inserted unchanged.
  // 4. Render the history with no entries.
  // 5. Verify the empty state is the `fr` value.
  it.todo('localizes the per-checklist history title and the empty state');
});
