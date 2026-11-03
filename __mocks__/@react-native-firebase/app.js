// Manual Jest mock for @react-native-firebase/app: the real module needs the
// native Firebase SDK, which doesn't exist under Jest.
module.exports = {
  getApp: jest.fn(() => ({})),
};
