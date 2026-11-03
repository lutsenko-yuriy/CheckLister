// Manual Jest mock for @react-native-firebase/analytics (modular API). Tests
// assert against these jest.fn()s; the real module needs the native SDK.
const analyticsInstance = {};

module.exports = {
  getAnalytics: jest.fn(() => analyticsInstance),
  logEvent: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
  setConsent: jest.fn(() => Promise.resolve()),
};
