import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RunPhotoRow } from './RunPhotoRow';
import type { Attachment } from '../../domain/models';

const photo = (id: string): Attachment => ({
  id,
  kind: 'photo',
  path: `attachments/r/${id}.jpg`,
  addedAt: '2026-11-07T10:00:00.000Z',
});

describe('RunPhotoRow', () => {
  it('shows the Photos title, a thumbnail per photo and a trailing +', async () => {
    await render(
      <RunPhotoRow
        photos={[photo('a'), photo('b')]}
        uriFor={p => `file:///${p.path}`}
        onOpen={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    expect(screen.getByText('Photos')).toBeTruthy();
    expect(screen.getByTestId('photo-thumbnail-a')).toBeTruthy();
    expect(screen.getByTestId('photo-thumbnail-b')).toBeTruthy();
    expect(screen.getByTestId('add-run-photo')).toBeTruthy();
  });

  it('opens a photo and adds a new one', async () => {
    const onOpen = jest.fn();
    const onAdd = jest.fn();
    await render(
      <RunPhotoRow
        photos={[photo('a')]}
        uriFor={p => `file:///${p.path}`}
        onOpen={onOpen}
        onAdd={onAdd}
      />,
    );

    await fireEvent.press(screen.getByTestId('photo-thumbnail-a'));
    await fireEvent.press(screen.getByTestId('add-run-photo'));

    expect(onOpen).toHaveBeenCalledWith(photo('a'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('does not press + when adding is disabled', async () => {
    const onAdd = jest.fn();
    await render(
      <RunPhotoRow
        photos={[]}
        uriFor={p => `file:///${p.path}`}
        onOpen={jest.fn()}
        onAdd={onAdd}
        addDisabled
      />,
    );

    await fireEvent.press(screen.getByTestId('add-run-photo'));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
