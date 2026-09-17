import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { SectionHeader } from './SectionHeader';
import { Section } from '../../domain/models';

const produce: Section = { id: 's1', name: 'Produce' };

describe('SectionHeader', () => {
  it('renders the section name', async () => {
    await render(
      <SectionHeader
        section={produce}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    expect(screen.getByText('Produce')).toBeTruthy();
  });

  it('renders the provided drag handle', async () => {
    await render(
      <SectionHeader
        section={produce}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    expect(screen.getByText('Handle')).toBeTruthy();
  });

  it('renders no name, actions, or drag handle for the default (null) section', async () => {
    await render(
      <SectionHeader
        section={null}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.queryByText('Handle')).toBeNull();
  });

  it('confirms before deleting, and only calls onDelete when confirmed', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        const deleteButton = buttons?.find(b => b.text === 'Delete');
        deleteButton?.onPress?.();
      });

    await render(
      <SectionHeader
        section={produce}
        onDelete={onDelete}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    fireEvent.press(screen.getByText('Delete'));

    expect(alertSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('does not call onDelete when the confirm dialog is cancelled', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(
      <SectionHeader
        section={produce}
        onDelete={onDelete}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    fireEvent.press(screen.getByText('Delete'));

    expect(onDelete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
