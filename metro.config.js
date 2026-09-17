const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // react-native-reanimated@3.x's non-Fabric findHostInstance path
      // requires this shim, which RN 0.87 (New Architecture only, see
      // android/gradle.properties' newArchEnabled=true) no longer ships —
      // only the Fabric shim remains. That branch is dead code here
      // (isFabric() is always true), but Metro still resolves every
      // `require(...)` it finds statically, so redirect it to the Fabric
      // shim purely to satisfy that static resolution.
      if (moduleName === 'react-native/Libraries/Renderer/shims/ReactNative') {
        return context.resolveRequest(
          context,
          'react-native/Libraries/Renderer/shims/ReactFabric',
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
