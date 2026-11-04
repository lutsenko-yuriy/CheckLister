import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

// Collection must stay off natively until the user allows analytics (CheL-126).
// These guard the native config that no runtime test can see.
describe('Firebase package versions', () => {
  it('pins remote-config to the same version as app', () => {
    const { dependencies } = JSON.parse(read('package.json'));
    expect(dependencies['@react-native-firebase/remote-config']).toBe(
      dependencies['@react-native-firebase/app'],
    );
  });
});

describe('Firebase native config', () => {
  const config = JSON.parse(read('firebase.json'))['react-native'];

  it.each([
    'app_data_collection_default_enabled',
    'analytics_auto_collection_enabled',
    'google_analytics_automatic_screen_reporting_enabled',
    'google_analytics_adid_collection_enabled',
    'google_analytics_ssaid_collection_enabled',
    'analytics_default_allow_analytics_storage',
    'analytics_default_allow_ad_storage',
    'analytics_default_allow_ad_user_data',
    'analytics_default_allow_ad_personalization_signals',
  ])('firebase.json sets %s to false', key => {
    expect(config[key]).toBe(false);
  });

  it('never permanently deactivates collection', () => {
    // true here would block collection even after the user allows it.
    expect(config).not.toHaveProperty('analytics_collection_deactivated');
  });

  it('removes the advertising ID permissions on Android', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toMatch(
      /com\.google\.android\.gms\.permission\.AD_ID"\s+tools:node="remove"/,
    );
    expect(manifest).toMatch(
      /android\.permission\.ACCESS_ADSERVICES_AD_ID"\s+tools:node="remove"/,
    );
  });

  it('keeps AdSupport out of the iOS build', () => {
    expect(read('ios/Podfile')).toMatch(
      /\$RNFirebaseAnalyticsWithoutAdIdSupport\s*=\s*true/,
    );
  });

  it('loads the icon font from the framework that dynamic linkage creates', () => {
    // Firebase 27 forces dynamic frameworks, which moves RNVectorIcons' fonts
    // out of the app bundle root; the old root path renders every icon as "?".
    expect(read('ios/Podfile')).toMatch(
      /ENV\['USE_FRAMEWORKS'\] \|\| 'dynamic'/,
    );
    expect(read('ios/CheckLister/Info.plist')).toContain(
      'Frameworks/RNVectorIcons.framework/MaterialIcons.ttf',
    );
  });
});
