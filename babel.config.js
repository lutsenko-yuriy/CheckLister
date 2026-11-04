module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // The scenario-build flag is replaced first so Metro can fold the guarded code away.
  plugins: [
    './scripts/babel/scenarioBuildPlugin',
    'react-native-reanimated/plugin',
  ],
};
