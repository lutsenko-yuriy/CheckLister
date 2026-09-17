module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-reanimated-dnd|react-native-vector-icons)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
