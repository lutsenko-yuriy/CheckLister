import { ConsentGatedAnalyticsService } from '../shared/analytics/ConsentGatedAnalyticsService';
import { RecordingAnalyticsService } from './RecordingAnalyticsService';

describe('RecordingAnalyticsService', () => {
  it('records events and screen views in order', () => {
    const recorder = new RecordingAnalyticsService();

    recorder.logScreenView('screen_settings');
    recorder.logEvent('item_added', { checklist_id: 'c1', item_count: 2 });

    expect(recorder.getRecords()).toEqual([
      { kind: 'screen', name: 'screen_settings', properties: {} },
      {
        kind: 'event',
        name: 'item_added',
        properties: { checklist_id: 'c1', item_count: 2 },
      },
    ]);
  });

  it('records a collection toggle only when the state changes', () => {
    const recorder = new RecordingAnalyticsService();

    recorder.setCollectionEnabled(false);
    recorder.setCollectionEnabled(true);
    recorder.setCollectionEnabled(true);
    recorder.setCollectionEnabled(false);

    expect(recorder.getRecords().map(r => [r.kind, r.name])).toEqual([
      ['collection', 'collection_on'],
      ['collection', 'collection_off'],
    ]);
  });

  it('clears the records and notifies subscribers', () => {
    const recorder = new RecordingAnalyticsService();
    const listener = jest.fn();
    recorder.logEvent('a');
    recorder.subscribe(listener);

    recorder.clear();

    expect(recorder.getRecords()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on each record until they unsubscribe', () => {
    const recorder = new RecordingAnalyticsService();
    const listener = jest.fn();
    const unsubscribe = recorder.subscribe(listener);

    recorder.logEvent('a');
    unsubscribe();
    recorder.logEvent('b');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('hands out a new array per change so subscribers see a fresh snapshot', () => {
    const recorder = new RecordingAnalyticsService();
    const before = recorder.getRecords();

    recorder.logEvent('a');

    expect(recorder.getRecords()).not.toBe(before);
    expect(before).toEqual([]);
  });

  it('records nothing behind the consent gate until consent is granted', () => {
    const recorder = new RecordingAnalyticsService();
    const gate = new ConsentGatedAnalyticsService(recorder);

    gate.logEvent('early');
    gate.setConsent('denied');
    gate.logEvent('denied');
    expect(recorder.getRecords()).toEqual([]);

    gate.setConsent('granted');
    gate.logEvent('item_added');
    expect(recorder.getRecords().map(r => r.name)).toEqual([
      'collection_on',
      'item_added',
    ]);
  });
});
