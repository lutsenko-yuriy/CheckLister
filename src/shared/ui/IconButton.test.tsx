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

  // CheL-46: a 22px icon with hitSlop={8} alone leaves an effective ~38x38pt
  // touch target, under the 44x44pt (Apple HIG) / 48x48dp (Material) minimum.
  it('has an effective touch target of at least 44x44pt regardless of icon size', async () => {
    await render(
      <IconButton icon="add" accessibilityLabel="Add" onPress={jest.fn()} />,
    );
    const button = screen.getByLabelText('Add');
    const flatStyle = [button.props.style].flat();
    const merged = Object.assign({}, ...flatStyle.filter(Boolean));

    expect(merged.minWidth).toBeGreaterThanOrEqual(44);
    expect(merged.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('still applies a caller-supplied style alongside the minimum touch target', async () => {
    await render(
      <IconButton
        icon="add"
        accessibilityLabel="Add"
        onPress={jest.fn()}
        style={{ marginLeft: 12 }}
      />,
    );
    const button = screen.getByLabelText('Add');
    const flatStyle = [button.props.style].flat();
    const merged = Object.assign({}, ...flatStyle.filter(Boolean));

    expect(merged.marginLeft).toBe(12);
    expect(merged.minWidth).toBeGreaterThanOrEqual(44);
  });
});
