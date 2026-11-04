import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme/useTheme';
import { AnalyticsConsentDialog } from './AnalyticsConsentDialog';

async function renderDialog(
  props: Partial<React.ComponentProps<typeof AnalyticsConsentDialog>> = {},
) {
  const onAllow = jest.fn();
  const onDeny = jest.fn();
  await render(
    <ThemeProvider>
      <AnalyticsConsentDialog
        visible
        onAllow={onAllow}
        onDeny={onDeny}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onAllow, onDeny };
}

describe('AnalyticsConsentDialog', () => {
  it('shows the title, the body and both buttons', async () => {
    await renderDialog();
    expect(screen.getByText('Help improve CheckLister?')).toBeTruthy();
    expect(
      screen.getByText(
        'Share anonymous usage data with our analytics provider so we can fix and improve the app. You can change this later in Settings.',
      ),
    ).toBeTruthy();
    expect(screen.getByText("Don't allow")).toBeTruthy();
    expect(screen.getByText('Allow')).toBeTruthy();
  });

  it('renders nothing while not visible', async () => {
    await renderDialog({ visible: false });
    expect(screen.queryByTestId('analytics-consent-dialog')).toBeNull();
  });

  it("calls onAllow only for Allow and onDeny only for Don't allow", async () => {
    const { onAllow, onDeny } = await renderDialog();
    await fireEvent.press(screen.getByTestId('analytics-consent-allow'));
    expect(onAllow).toHaveBeenCalledTimes(1);
    expect(onDeny).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('analytics-consent-deny'));
    expect(onDeny).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed: the Android back button does nothing', async () => {
    const { onAllow, onDeny } = await renderDialog();
    const modal = screen.getByTestId('analytics-consent-modal');
    modal.props.onRequestClose();
    expect(onAllow).not.toHaveBeenCalled();
    expect(onDeny).not.toHaveBeenCalled();
  });

  it('cannot be dismissed: pressing the backdrop or the card chooses nothing', async () => {
    const { onAllow, onDeny } = await renderDialog();
    await fireEvent.press(screen.getByTestId('analytics-consent-backdrop'));
    await fireEvent.press(screen.getByTestId('analytics-consent-dialog'));
    expect(onAllow).not.toHaveBeenCalled();
    expect(onDeny).not.toHaveBeenCalled();
    expect(screen.getByTestId('analytics-consent-dialog')).toBeTruthy();
  });

  it('keeps the text scrollable and the card within the window height', async () => {
    await renderDialog();
    expect(screen.getByTestId('analytics-consent-scroll')).toBeTruthy();
    const style = Object.assign(
      {},
      ...[screen.getByTestId('analytics-consent-dialog').props.style].flat(),
    );
    expect(style.maxHeight).toBeGreaterThan(0);
  });

  it('marks the title as a header and traps accessibility focus', async () => {
    await renderDialog();
    expect(
      screen.getByText('Help improve CheckLister?').props.accessibilityRole,
    ).toBe('header');
    expect(
      screen.getByTestId('analytics-consent-dialog').props
        .accessibilityViewIsModal,
    ).toBe(true);
  });

  it('gives both buttons the button role and at least a 44pt target', async () => {
    await renderDialog();
    for (const id of ['analytics-consent-allow', 'analytics-consent-deny']) {
      const button = screen.getByTestId(id);
      expect(button.props.accessibilityRole).toBe('button');
      const style = Object.assign({}, ...[button.props.style].flat());
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
