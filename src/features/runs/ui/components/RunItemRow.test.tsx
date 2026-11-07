import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { RunItemRow } from './RunItemRow';
import { darkPalette } from '../../../../shared/theme/palette';
import { ThemeProvider } from '../../../../shared/theme/useTheme';

describe('RunItemRow', () => {
  it('renders the item text', async () => {
    await render(
      <RunItemRow
        item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText('Milk')).toBeTruthy();
  });

  it('reflects checked state through accessibilityState', async () => {
    await render(
      <RunItemRow
        item={{ id: 'a', text: 'Milk', checked: true, photo: null }}
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
        item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
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
          item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
          onToggle={jest.fn()}
        />
      </ThemeProvider>,
    );

    const flatStyle = [screen.getByTestId('run-item-row-a').props.style].flat();
    expect(flatStyle).toContainEqual(
      expect.objectContaining({ backgroundColor: darkPalette.surface }),
    );
  });

  describe('photo slot', () => {
    const photo = {
      id: 'att-1',
      kind: 'photo' as const,
      path: 'attachments/r/att-1.jpg',
      addedAt: '2026-11-07T10:00:00.000Z',
    };

    it('shows no photo control when the parent passes none', async () => {
      await render(
        <RunItemRow
          item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
          onToggle={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('add-item-photo-a')).toBeNull();
    });

    it('shows a + that adds without toggling', async () => {
      const onToggle = jest.fn();
      const onAdd = jest.fn();
      await render(
        <RunItemRow
          item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
          onToggle={onToggle}
          photo={{ uri: null, onAdd, onOpen: jest.fn() }}
        />,
      );

      await fireEvent.press(screen.getByTestId('add-item-photo-a'));

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('shows the thumbnail instead of the + and opens it', async () => {
      const onOpen = jest.fn();
      await render(
        <RunItemRow
          item={{ id: 'a', text: 'Milk', checked: false, photo }}
          onToggle={jest.fn()}
          photo={{ uri: 'file:///x.jpg', onAdd: jest.fn(), onOpen }}
        />,
      );

      expect(screen.queryByTestId('add-item-photo-a')).toBeNull();
      await fireEvent.press(screen.getByTestId('photo-thumbnail-att-1'));
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('disables the +', async () => {
      const onAdd = jest.fn();
      await render(
        <RunItemRow
          item={{ id: 'a', text: 'Milk', checked: false, photo: null }}
          onToggle={jest.fn()}
          photo={{ uri: null, onAdd, onOpen: jest.fn(), addDisabled: true }}
        />,
      );

      await fireEvent.press(screen.getByTestId('add-item-photo-a'));

      expect(onAdd).not.toHaveBeenCalled();
    });
  });
});
