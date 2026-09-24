module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest',
    // The library's own jest.fn()-wrapped mock (en-US, fr-FR; country US);
    // tests override getLocales/getCountry per case via jest.mocked().
    '^react-native-localize$': 'react-native-localize/mock/jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-reanimated-dnd|react-native-vector-icons)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
