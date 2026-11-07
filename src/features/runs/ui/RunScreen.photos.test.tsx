import React, { useEffect, useRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert, Linking, Text } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunsProvider, useRuns } from '../useRuns';
import {
  FakePhotoPicker,
  makeFakeAttachmentStore,
  makeFakePhotoPicker,
} from '../testing/photoFakes';
import { RunScreen } from './RunScreen';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { createChecklist, createItem } from '../../checklists/domain/models';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import * as killSwitches from '../../../shared/killSwitches/useKillSwitches';
import type { PickResult } from '../domain/photoPicker';

type TestParamList = {
  Placeholder: undefined;
  Run: { checklistId: string };
  PhotoViewer: { context: 'active_run'; runId: string; attachmentId: string };
};
const Stack = createNativeStackNavigator<TestParamList>();

function Placeholder() {
  return null;
}

function Viewer() {
  return <Text>viewer</Text>;
}

function RunHarness(props: Record<string, unknown>) {
  const { startRun, activeRun } = useRuns();
  const started = useRef(false);
  const checklist = useRef({
    ...createChecklist('Groceries'),
    items: [createItem('Milk'), createItem('Eggs')],
  }).current;

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      startRun(checklist);
    }
  }, [checklist, startRun]);

  return activeRun ? <RunScreen {...(props as any)} /> : null;
}

async function renderRun(picker: FakePhotoPicker = makeFakePhotoPicker()) {
  const navigationRef = createNavigationContainerRef<TestParamList>();
  const utils = await render(
    <ThemeProvider>
      <RunsProvider
        repository={new AsyncStorageRunRepository()}
        attachmentStore={makeFakeAttachmentStore()}
        photoPicker={picker}
      >
        <NavigationContainer
          ref={navigationRef}
          initialState={{
            index: 1,
            routes: [
              { name: 'Placeholder' },
              { name: 'Run', params: { checklistId: 'c' } },
            ],
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Placeholder" component={Placeholder} />
            <Stack.Screen name="Run">
              {props => <RunHarness {...props} />}
            </Stack.Screen>
            <Stack.Screen name="PhotoViewer" component={Viewer} />
          </Stack.Navigator>
        </NavigationContainer>
      </RunsProvider>
    </ThemeProvider>,
  );
  await waitFor(() => screen.getByText('Milk'));
  return { navigationRef, picker, ...utils };
}

type AlertButton = { text: string; onPress?: () => void };

function lastAlert() {
  const calls = jest.mocked(Alert.alert).mock.calls;
  const [title, message, buttons] = calls[calls.length - 1];
  return { title, message, buttons: (buttons ?? []) as AlertButton[] };
}

async function pressAlertButton(text: string) {
  const button = lastAlert().buttons.find(b => b.text === text)!;
  await act(async () => {
    button.onPress?.();
  });
}

async function attachToFirstItem(source: 'Take photo' | 'Choose from library') {
  await fireEvent.press(screen.getByLabelText('Add photo to Milk'));
  await pressAlertButton(source);
}

describe('RunScreen photos', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(analytics, 'logEvent');
    jest.spyOn(killSwitches, 'useKillSwitch').mockReturnValue(true);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('shows a + on every item and on the run, and no thumbnails', async () => {
    await renderRun();

    expect(screen.getByLabelText('Add photo to Milk')).toBeTruthy();
    expect(screen.getByLabelText('Add photo to Eggs')).toBeTruthy();
    expect(screen.getByLabelText('Add photo to this run')).toBeTruthy();
    expect(screen.queryByLabelText('Open photo')).toBeNull();
  });

  it('opens the add sheet with the two sources and Cancel', async () => {
    await renderRun();

    await fireEvent.press(screen.getByLabelText('Add photo to Milk'));

    const { title, buttons } = lastAlert();
    expect(title).toBe('Add photo');
    expect(buttons.map(b => b.text)).toEqual([
      'Take photo',
      'Choose from library',
      'Cancel',
    ]);
  });

  it('replaces the item + with the thumbnail without toggling the item', async () => {
    const { picker } = await renderRun();

    await attachToFirstItem('Choose from library');

    expect(picker.pick).toHaveBeenCalledWith('library');
    await waitFor(() => screen.getByTestId('photo-thumbnail-att-1'));
    expect(screen.queryByLabelText('Add photo to Milk')).toBeNull();
    expect(screen.getByText('0 of 2 checked')).toBeTruthy();
  });

  it('adds run photos and keeps the + at the end of the row', async () => {
    await renderRun();

    for (let i = 0; i < 2; i++) {
      await fireEvent.press(screen.getByLabelText('Add photo to this run'));
      await pressAlertButton('Take photo');
    }

    await waitFor(() => screen.getByTestId('photo-thumbnail-att-2'));
    expect(screen.getByTestId('photo-thumbnail-att-1')).toBeTruthy();
    expect(screen.getByLabelText('Add photo to this run')).toBeTruthy();
  });

  it('logs photo_attached', async () => {
    await renderRun();

    await fireEvent.press(screen.getByLabelText('Add photo to this run'));
    await pressAlertButton('Take photo');

    await waitFor(() =>
      expect(analytics.logEvent).toHaveBeenCalledWith('photo_attached', {
        checklist_id: expect.any(String),
        target: 'run',
        source: 'camera',
        run_photo_count: 1,
      }),
    );
  });

  it('explains denied access, offers Open Settings and logs it', async () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    await renderRun(makeFakePhotoPicker({ type: 'denied' }));

    await attachToFirstItem('Take photo');

    await waitFor(() => expect(lastAlert().title).toBe('Photo access is off'));
    expect(lastAlert().buttons.map(b => b.text)).toEqual([
      'Cancel',
      'Open Settings',
    ]);
    expect(analytics.logEvent).toHaveBeenCalledWith('photo_permission_denied', {
      source: 'camera',
    });
    await pressAlertButton('Open Settings');
    expect(openSettings).toHaveBeenCalled();
    expect(screen.getByLabelText('Add photo to Milk')).toBeTruthy();
  });

  it.each<[PickResult, string]>([
    [{ type: 'unavailable' }, 'Camera not available'],
    [{ type: 'failed' }, 'Could not add photo'],
  ])('tells the user when the pick is %j', async (result, title) => {
    await renderRun(makeFakePhotoPicker(result));

    await attachToFirstItem('Take photo');

    await waitFor(() => expect(lastAlert().title).toBe(title));
  });

  it('stays quiet when the pick is cancelled', async () => {
    await renderRun(makeFakePhotoPicker({ type: 'cancelled' }));

    await attachToFirstItem('Take photo');

    expect(jest.mocked(Alert.alert)).toHaveBeenCalledTimes(1);
    expect(analytics.logEvent).not.toHaveBeenCalledWith(
      'photo_attached',
      expect.anything(),
    );
  });

  it('opens the viewer for a tapped thumbnail', async () => {
    const { navigationRef } = await renderRun();
    await attachToFirstItem('Take photo');
    await waitFor(() => screen.getByTestId('photo-thumbnail-att-1'));

    await fireEvent.press(screen.getByTestId('photo-thumbnail-att-1'));

    const route = navigationRef.current?.getCurrentRoute();
    expect(route?.name).toBe('PhotoViewer');
    expect(route?.params).toEqual({
      context: 'active_run',
      runId: expect.any(String),
      attachmentId: 'att-1',
    });
  });

  it('disables Complete and the + buttons while a photo is being added', async () => {
    let resolvePick!: (result: PickResult) => void;
    const picker = makeFakePhotoPicker();
    picker.pick.mockImplementation(
      () => new Promise<PickResult>(resolve => (resolvePick = resolve)),
    );
    await renderRun(picker);
    await fireEvent.press(screen.getByText('Milk'));
    await fireEvent.press(screen.getByText('Eggs'));

    await attachToFirstItem('Take photo');

    expect(
      screen.getByLabelText('Complete the checklist').props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    expect(
      screen.getByLabelText('Add photo to Eggs').props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));

    await act(async () => resolvePick({ type: 'cancelled' }));
    expect(
      screen.getByLabelText('Complete the checklist').props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: false }));
  });

  it('hides every photo control when the photos kill-switch is off', async () => {
    jest.spyOn(killSwitches, 'useKillSwitch').mockReturnValue(false);
    await renderRun();

    expect(screen.queryByLabelText('Add photo to Milk')).toBeNull();
    expect(screen.queryByLabelText('Add photo to this run')).toBeNull();
    expect(screen.queryByText('Photos')).toBeNull();
    expect(screen.getByText('Milk')).toBeTruthy();
  });
});
