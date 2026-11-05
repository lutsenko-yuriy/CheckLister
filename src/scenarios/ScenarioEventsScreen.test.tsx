import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { RecordingAnalyticsService } from './RecordingAnalyticsService';
import { ScenarioEventsScreen } from './ScenarioEventsScreen';

describe('ScenarioEventsScreen', () => {
  it('shows an empty state', async () => {
    await render(
      <ScenarioEventsScreen recorder={new RecordingAnalyticsService()} />,
    );

    expect(screen.getByText('0 recorded')).toBeTruthy();
  });

  it('lists each record with its properties', async () => {
    const recorder = new RecordingAnalyticsService();
    recorder.logScreenView('screen_checklist_detail', { item_count: 1 });
    recorder.logEvent('item_added', { checklist_id: 'c1', item_count: 1 });
    recorder.logEvent('analytics_consent_granted');
    recorder.setCollectionEnabled(true);

    await render(<ScenarioEventsScreen recorder={recorder} />);

    expect(screen.getByText('4 recorded')).toBeTruthy();
    expect(
      screen.getByText('screen_checklist_detail (item_count: 1)'),
    ).toBeTruthy();
    expect(
      screen.getByText('item_added (checklist_id: c1, item_count: 1)'),
    ).toBeTruthy();
    expect(screen.getByText('analytics_consent_granted')).toBeTruthy();
    expect(screen.getByText('collection_on')).toBeTruthy();
  });

  it('updates live while open and after a clear', async () => {
    const recorder = new RecordingAnalyticsService();
    await render(<ScenarioEventsScreen recorder={recorder} />);

    await act(async () => recorder.logEvent('item_added'));
    expect(screen.getByText('1 recorded')).toBeTruthy();
    expect(screen.getByText('item_added')).toBeTruthy();

    await act(async () => recorder.clear());
    expect(screen.getByText('0 recorded')).toBeTruthy();
    expect(screen.queryByText('item_added')).toBeNull();
  });
});
