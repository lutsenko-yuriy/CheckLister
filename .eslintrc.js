module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['vendor/', 'ios/Pods/', 'ios/build/', 'android/build/'],
  rules: {
    'no-implicit-coercion': [
      'error',
      { boolean: true, number: false, string: false },
    ],
  },
  overrides: [
    {
      // @checklister/i18n (N/A-87) is a generic-subdomain workspace package:
      // it must never import back into the host app, only its own files and
      // external dependencies. A host-side dependency (e.g. analytics)
      // crosses this boundary via a caller-supplied callback prop instead
      // (see I18nProvider's onLanguageResolved).
      files: ['packages/i18n/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/src/**', '**/App', '**/App.tsx'],
                message:
                  'packages/i18n must not import from the host app (src/ or App.tsx) — inject a callback prop instead.',
              },
            ],
          },
        ],
      },
    },
  ],
};
