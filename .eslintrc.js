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
};
