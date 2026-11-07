// Manual Jest mock for react-native-image-picker: the real module needs the
// native camera and photo picker. Tests set each result per case.
module.exports = {
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
};
