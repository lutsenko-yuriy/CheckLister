/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

// useSafeAreaInsets throws without a SafeAreaProvider; screens render bare in tests.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
