// Manual Jest mock for @react-native-firebase/remote-config (modular API).
// getValue returns "" for every key unless a test overrides it.
const remoteConfigInstance = {};

module.exports = {
  getRemoteConfig: jest.fn(() => remoteConfigInstance),
  setDefaults: jest.fn(() => Promise.resolve()),
  setConfigSettings: jest.fn(() => Promise.resolve()),
  ensureInitialized: jest.fn(() => Promise.resolve()),
  getValue: jest.fn(() => ({ asString: () => '' })),
  fetchAndActivate: jest.fn(() => Promise.resolve(false)),
};
