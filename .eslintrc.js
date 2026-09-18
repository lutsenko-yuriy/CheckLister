module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'no-implicit-coercion': [
      'error',
      { boolean: true, number: false, string: false },
    ],
  },
};
