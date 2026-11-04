import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={noop}
      testID="analytics-consent-modal"
    >
      <View style={styles.backdrop} testID="analytics-consent-backdrop">
        <View
          style={[styles.card, { maxHeight: height * CARD_MAX_HEIGHT_RATIO }]}
          accessibilityViewIsModal
          testID="analytics-consent-dialog"
        >
          <ScrollView style={styles.scroll} testID="analytics-consent-scroll">
            <Text style={styles.title} accessibilityRole="header">
              {t('analyticsConsent.title')}
            </Text>
            <Text style={styles.body}>{t('analyticsConsent.body')}</Text>
          </ScrollView>
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

// Large text or landscape can make the text taller than the screen; the text
// scrolls and the buttons stay reachable, since the dialog cannot be dismissed.
const CARD_MAX_HEIGHT_RATIO = 0.9;

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
  scroll: {
    flexGrow: 0,
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
