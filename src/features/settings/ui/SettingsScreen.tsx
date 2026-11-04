import React, { useEffect, useRef } from 'react';
import { Switch, Text, View } from 'react-native';
import { useI18n } from '@checklister/i18n';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { useAnalyticsConsent } from '../../../shared/analytics/useAnalyticsConsent';
import { createThemedStyles } from '../../../shared/theme/createThemedStyles';
import { useTheme } from '../../../shared/theme/useTheme';

export function SettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { status, setChoice } = useAnalyticsConsent();
  const hasLoggedView = useRef(false);

  useEffect(() => {
    if (hasLoggedView.current) {
      return;
    }
    hasLoggedView.current = true;
    analytics.logScreenView('screen_settings');
  }, []);

  return (
    <View style={styles.container} testID="settings-screen">
      <View style={styles.row}>
        <Text style={styles.label}>{t('settings.analyticsToggle')}</Text>
        <Switch
          testID="analytics-consent-switch"
          accessibilityLabel={t('settings.analyticsToggle')}
          value={status === 'granted'}
          onValueChange={on => setChoice(on ? 'granted' : 'denied')}
          trackColor={{ true: colors.primary }}
        />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles(colors => ({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  label: {
    flex: 1,
    marginRight: 12,
    fontSize: 16,
    color: colors.text,
  },
}));
