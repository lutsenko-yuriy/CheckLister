import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ItemRow } from './ItemRow';
import { Item } from '../../domain/models';

function item(overrides: Partial<Item> = {}): Item {
  return { id: 'a', text: 'Milk', checked: false, sectionId: null, ...overrides };
}

describe('ItemRow', () => {
  it('renders the item text unchecked by default', async () => {
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        drag={jest.fn()}
        isActive={false}
      />,
    );
    expect(screen.getByText('Milk')).toBeTruthy();
  });

  it('calls onToggle when the item text is pressed', async () => {
    const onToggle = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={onToggle}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        drag={jest.fn()}
        isActive={false}
      />,
    );
    fireEvent.press(screen.getByText('Milk'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('calls drag on a long press of the drag handle', async () => {
    const drag = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        drag={drag}
        isActive={false}
      />,
    );
    fireEvent(screen.getByLabelText('Drag to reorder'), 'longPress');
    expect(drag).toHaveBeenCalled();
  });

  it('edits the item text via Edit/Save', async () => {
    const onEdit = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={onEdit}
        onDelete={jest.fn()}
        drag={jest.fn()}
        isActive={false}
      />,
    );
    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.changeText(screen.getByDisplayValue('Milk'), 'Oat milk');
    await fireEvent.press(screen.getByText('Save'));
    expect(onEdit).toHaveBeenCalledWith('Oat milk');
  });

  it('calls onDelete when Delete is pressed', async () => {
    const onDelete = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={onDelete}
        drag={jest.fn()}
        isActive={false}
      />,
    );
    fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
