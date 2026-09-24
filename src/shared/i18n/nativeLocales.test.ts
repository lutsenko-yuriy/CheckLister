import fs from 'fs';
import path from 'path';
import { SUPPORTED_LANGUAGES, type AppLanguage } from './languages';

const ROOT = path.resolve(__dirname, '../../..');

const NON_DEFAULT_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  language => language !== 'en',
);

/** en/de/fr keep the Latin brand name; ru is transliterated (#80 plan amendment). */
const EXPECTED_DISPLAY_NAMES: Readonly<Record<AppLanguage, string>> = {
  en: 'CheckLister',
  de: 'CheckLister',
  fr: 'CheckLister',
  ru: 'ЧекЛистер',
};

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('iOS localization declarations', () => {
  it('declares CFBundleLocalizations matching SUPPORTED_LANGUAGES', () => {
    const infoPlist = readFile('ios/CheckLister/Info.plist');
    const match = infoPlist.match(
      /<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/,
    );
    expect(match).not.toBeNull();
    const declared = Array.from(
      (match?.[1] ?? '').matchAll(/<string>(\w+)<\/string>/g),
    ).map(m => m[1]);
    expect(declared.sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it.each(SUPPORTED_LANGUAGES)(
    'ships %s.lproj/InfoPlist.strings with the expected CFBundleDisplayName',
    language => {
      const contents = readFile(
        `ios/CheckLister/${language}.lproj/InfoPlist.strings`,
      );
      expect(contents).toContain(
        `"CFBundleDisplayName" = "${EXPECTED_DISPLAY_NAMES[language]}";`,
      );
    },
  );

  it('registers every supported language in the Xcode project knownRegions', () => {
    const pbxproj = readFile('ios/CheckLister.xcodeproj/project.pbxproj');
    const match = pbxproj.match(/knownRegions = \(([\s\S]*?)\);/);
    expect(match).not.toBeNull();
    const declared = Array.from(
      (match?.[1] ?? '').matchAll(/^\s*(\w+),\s*$/gm),
    ).map(m => m[1]);
    for (const language of SUPPORTED_LANGUAGES) {
      expect(declared).toContain(language);
    }
  });
});

describe('Android localization declarations', () => {
  it('declares every supported language in locales_config.xml', () => {
    const contents = readFile(
      'android/app/src/main/res/xml/locales_config.xml',
    );
    const declared = Array.from(
      contents.matchAll(/android:name="([\w-]+)"/g),
    ).map(m => m[1]);
    expect(declared.sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('wires android:localeConfig on the application element', () => {
    const manifest = readFile('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toMatch(/android:localeConfig="@xml\/locales_config"/);
  });

  it('declares locale and layoutDirection in MainActivity configChanges', () => {
    const manifest = readFile('android/app/src/main/AndroidManifest.xml');
    const match = manifest.match(/android:configChanges="([^"]+)"/);
    expect(match).not.toBeNull();
    const changes = (match?.[1] ?? '').split('|');
    expect(changes).toEqual(
      expect.arrayContaining(['locale', 'layoutDirection']),
    );
  });

  it('sets the default resource locale explicitly', () => {
    const contents = readFile('android/app/src/main/res/resources.properties');
    expect(contents).toContain('unqualifiedResLocale=en');
  });

  it('restricts packaged resource locales via androidResources.localeFilters', () => {
    const gradle = readFile('android/app/build.gradle');
    const match = gradle.match(/localeFilters\s*\+?=\s*\[([^\]]*)\]/);
    expect(match).not.toBeNull();
    const declared = Array.from((match?.[1] ?? '').matchAll(/"(\w+)"/g)).map(
      m => m[1],
    );
    expect(declared.sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it.each(NON_DEFAULT_LANGUAGES)(
    'ships values-%s/strings.xml with the expected app_name',
    language => {
      const contents = readFile(
        `android/app/src/main/res/values-${language}/strings.xml`,
      );
      expect(contents).toContain(
        `<string name="app_name">${EXPECTED_DISPLAY_NAMES[language]}</string>`,
      );
    },
  );

  it('keeps the default (English) app_name in values/strings.xml', () => {
    const contents = readFile('android/app/src/main/res/values/strings.xml');
    expect(contents).toContain(
      `<string name="app_name">${EXPECTED_DISPLAY_NAMES.en}</string>`,
    );
  });
});
