import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders with the given accessibility label', async () => {
    await render(
      <IconButton icon="add" accessibilityLabel="Add" onPress={jest.fn()} />,
    );
    expect(screen.getByLabelText('Add')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton
        icon="delete"
        accessibilityLabel="Delete"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByLabelText('Delete'));
    expect(onPress).toHaveBeenCalled();
  });
});
