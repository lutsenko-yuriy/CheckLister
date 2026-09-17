// Manual Jest mock for react-native-reanimated.
//
// The library's own `react-native-reanimated/mock` initializes the real
// native module bridge (via `react-native-worklets`) as a side effect of
// being imported, which throws under Jest for this RN/reanimated version
// pairing (`[Reanimated] setCSSEventHandler is not available in
// JSReanimated`). This mock replaces the module entirely with plain
// JS/no-op equivalents covering the API surface this app and its
// dependencies (react-native-draggable-flatlist) actually use, so nothing
// touches the native/worklet runtime in tests.
const React = require('react');
const RN = require('react-native');

const identity = value => value;
const passthroughComponent = Component =>
  React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));

module.exports = {
  __esModule: true,
  default: {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    createAnimatedComponent: passthroughComponent,
    call: () => {},
  },
  createAnimatedComponent: passthroughComponent,
  useSharedValue: initial => ({ value: initial }),
  useAnimatedStyle: fn => fn(),
  useDerivedValue: fn => ({ value: fn() }),
  useAnimatedReaction: () => {},
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => () => {},
  useAnimatedGestureHandler: () => ({}),
  useAnimatedProps: fn => fn(),
  withTiming: (toValue, _config, callback) => {
    callback?.(true);
    return toValue;
  },
  withSpring: (toValue, _config, callback) => {
    callback?.(true);
    return toValue;
  },
  withDecay: toValue => toValue,
  withRepeat: toValue => toValue,
  cancelAnimation: () => {},
  interpolate: identity,
  interpolateColor: identity,
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    bezier: () => identity,
    in: fn => fn,
    out: fn => fn,
    inOut: fn => fn,
  },
  runOnJS: fn => fn,
  runOnUI: fn => fn,
  scrollTo: () => {},
  measure: () => null,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  Layout: { duration: () => ({}) },
};
