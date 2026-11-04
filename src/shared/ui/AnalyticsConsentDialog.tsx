import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useI18n } from '@checklister/i18n';
import { createThemedStyles } from '../theme/createThemedStyles';

// CheL-126: a choice is required, so there is no dismiss path: the backdrop
// has no press handler and Android back is swallowed. Allow and Don't allow
// share one style on purpose (equal weight, no nudge toward Allow).
export function AnalyticsConsentDialog({
  visible,
  onAllow,
  onDeny,
}: {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={noop}
      testID="analytics-consent-modal"
    >
      <View style={styles.backdrop} testID="analytics-consent-backdrop">
        <View
          style={styles.card}
          accessibilityViewIsModal
          testID="analytics-consent-dialog"
        >
          <Text style={styles.title} accessibilityRole="header">
            {t('analyticsConsent.title')}
          </Text>
          <Text style={styles.body}>{t('analyticsConsent.body')}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              onPress={onDeny}
              accessibilityRole="button"
              testID="analytics-consent-deny"
            >
              <Text style={styles.buttonText}>
                {t('analyticsConsent.deny')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={onAllow}
              accessibilityRole="button"
              testID="analytics-consent-allow"
            >
              <Text style={styles.buttonText}>
                {t('analyticsConsent.allow')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function noop() {}

const useStyles = createThemedStyles(colors => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.linkText,
  },
}));
