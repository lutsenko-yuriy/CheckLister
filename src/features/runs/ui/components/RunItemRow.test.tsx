import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { RunItemRow } from './RunItemRow';
import { darkPalette } from '../../../../shared/theme/palette';
import { ThemeProvider } from '../../../../shared/theme/useTheme';

describe('RunItemRow', () => {
  it('renders the item text', async () => {
    await render(
      <RunItemRow
        item={{ id: 'a', text: 'Milk', checked: false }}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText('Milk')).toBeTruthy();
  });

  it('reflects checked state through accessibilityState', async () => {
    await render(
      <RunItemRow
        item={{ id: 'a', text: 'Milk', checked: true }}
        onToggle={jest.fn()}
      />,
    );

    const row = screen.getByRole('checkbox');
    expect(row.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it('calls onToggle when pressed', async () => {
    const onToggle = jest.fn();
    await render(
      <RunItemRow
        item={{ id: 'a', text: 'Milk', checked: false }}
        onToggle={onToggle}
      />,
    );

    await fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders with the dark palette when in dark mode', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <RunItemRow
          item={{ id: 'a', text: 'Milk', checked: false }}
          onToggle={jest.fn()}
        />
      </ThemeProvider>,
    );

    const flatStyle = [screen.getByRole('checkbox').props.style].flat();
    expect(flatStyle).toContainEqual(
      expect.objectContaining({ backgroundColor: darkPalette.surface }),
    );
  });
});
