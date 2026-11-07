import React, { useEffect, useRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunsProvider, useRuns } from '../useRuns';
import {
  makeFakeAttachmentStore,
  makeFakePhotoPicker,
  photoDeps,
} from '../testing/photoFakes';
import { PhotoViewerScreen } from './PhotoViewerScreen';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { createChecklist, createItem } from '../../checklists/domain/models';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import * as killSwitches from '../../../shared/killSwitches/useKillSwitches';

type TestParamList = {
  Run: undefined;
  PhotoViewer: {
    context: 'active_run' | 'past_run';
    runId: string;
    attachmentId: string;
  };
};
const Stack = createNativeStackNavigator<TestParamList>();

type Api = ReturnType<typeof useRuns>;

function RunStub() {
  return <Text>run screen</Text>;
}

// Starts a run, attaches an item photo (att-1) and a run photo (att-2), then
// opens the viewer on `open`.
function Harness({
  open,
  onApi,
  navigationRef,
}: {
  open: string;
  onApi: (api: Api) => void;
  navigationRef: ReturnType<typeof createNavigationContainerRef<TestParamList>>;
}) {
  const api = useRuns();
  const started = useRef(false);
  onApi(api);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    api.startRun(checklist);
  }, [api]);

  const step = useRef(0);
  useEffect(() => {
    const run = api.activeRun;
    if (!run || api.attachingPhoto) {
      return;
    }
    if (step.current === 0) {
      step.current = 1;
      api.attachPhoto({ type: 'item', runItemId: run.items[0].id }, 'camera');
    } else if (step.current === 1 && run.items[0].photo) {
      step.current = 2;
      api.attachPhoto({ type: 'run' }, 'camera');
    } else if (step.current === 2 && run.photos.length === 1) {
      step.current = 3;
      navigationRef.navigate('PhotoViewer', {
        context: 'active_run',
        runId: run.id,
        attachmentId: open,
      });
    }
  }, [api, navigationRef, open]);

  return null;
}

async function renderViewer(open = 'att-1') {
  const navigationRef = createNavigationContainerRef<TestParamList>();
  const apiRef: { current: Api | null } = { current: null };
  await render(
    <ThemeProvider>
      <RunsProvider
        repository={new AsyncStorageRunRepository()}
        attachmentStore={makeFakeAttachmentStore()}
        photoPicker={makeFakePhotoPicker()}
      >
        <Harness
          open={open}
          onApi={api => (apiRef.current = api)}
          navigationRef={navigationRef}
        />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Run" component={RunStub} />
            <Stack.Screen name="PhotoViewer" component={PhotoViewerScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </RunsProvider>
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(navigationRef.getCurrentRoute()?.name).toBe('PhotoViewer'),
  );
  return { navigationRef, apiRef };
}

describe('PhotoViewerScreen', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(analytics, 'logEvent');
    jest.spyOn(analytics, 'logScreenView');
    jest.spyOn(killSwitches, 'useKillSwitch').mockReturnValue(true);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('shows the photo with Close and Remove, and logs the screen view', async () => {
    await renderViewer('att-1');

    expect(screen.getByTestId('photo-viewer-image').props.source).toEqual({
      uri: expect.stringContaining('att-1.jpg'),
    });
    expect(screen.getByLabelText('Close')).toBeTruthy();
    expect(screen.getByLabelText('Remove')).toBeTruthy();
    expect(analytics.logScreenView).toHaveBeenCalledWith(
      'screen_photo_viewer',
      { context: 'active_run', target: 'item' },
    );
  });

  it('closes on Close', async () => {
    const { navigationRef } = await renderViewer();

    await fireEvent.press(screen.getByLabelText('Close'));

    await waitFor(() =>
      expect(navigationRef.getCurrentRoute()?.name).toBe('Run'),
    );
  });

  it('asks before removing and keeps the photo on Cancel', async () => {
    const { navigationRef, apiRef } = await renderViewer();

    await fireEvent.press(screen.getByLabelText('Remove'));

    const [title, , buttons] = jest.mocked(Alert.alert).mock.calls[0];
    expect(title).toBe('Remove photo?');
    expect((buttons as { text: string }[]).map(b => b.text)).toEqual([
      'Cancel',
      'Remove',
    ]);
    expect(navigationRef.getCurrentRoute()?.name).toBe('PhotoViewer');
    expect(apiRef.current?.activeRun?.items[0].photo).not.toBeNull();
  });

  it('removes the photo, logs it and closes once', async () => {
    const { navigationRef, apiRef } = await renderViewer('att-1');
    await fireEvent.press(screen.getByLabelText('Remove'));
    const buttons = jest.mocked(Alert.alert).mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];

    await act(async () => {
      buttons.find(b => b.text === 'Remove')!.onPress!();
    });

    await waitFor(() =>
      expect(navigationRef.getCurrentRoute()?.name).toBe('Run'),
    );
    expect(navigationRef.getRootState()!.routes).toHaveLength(1);
    expect(apiRef.current?.activeRun?.items[0].photo).toBeNull();
    expect(analytics.logEvent).toHaveBeenCalledWith('photo_removed', {
      checklist_id: expect.any(String),
      target: 'item',
    });
  });

  it('reports a run photo as target run', async () => {
    await renderViewer('att-2');

    expect(analytics.logScreenView).toHaveBeenCalledWith(
      'screen_photo_viewer',
      { context: 'active_run', target: 'run' },
    );
  });

  it('closes itself when the photo is gone', async () => {
    const { navigationRef, apiRef } = await renderViewer('att-1');

    await act(async () => {
      await apiRef.current!.removePhoto('att-1');
    });

    await waitFor(() =>
      expect(navigationRef.getCurrentRoute()?.name).toBe('Run'),
    );
    expect(navigationRef.getRootState()!.routes).toHaveLength(1);
  });

  it('closes itself when the photos kill-switch turns off', async () => {
    const spy = jest.spyOn(killSwitches, 'useKillSwitch');
    const { navigationRef, apiRef } = await renderViewer('att-1');

    spy.mockReturnValue(false);
    await act(async () => {
      // Any provider update re-renders the viewer.
      await apiRef.current!.removePhoto('att-2');
    });

    await waitFor(() =>
      expect(navigationRef.getCurrentRoute()?.name).toBe('Run'),
    );
  });

  describe('past run', () => {
    async function renderPastViewer(attachmentId: string) {
      const repository = new AsyncStorageRunRepository();
      await repository.saveAll([
        {
          id: 'old',
          checklistId: 'c',
          checklistTitle: 'Groceries',
          itemCount: 1,
          completedAt: '2026-09-18T18:42:00.000Z',
          items: [
            {
              id: 'i',
              text: 'Milk',
              checked: true,
              photo: {
                id: 'att-9',
                kind: 'photo',
                path: 'attachments/old/att-9.jpg',
                addedAt: '2026-09-18T18:00:00.000Z',
              },
            },
          ],
          photos: [],
        },
      ]);
      const navigationRef = createNavigationContainerRef<TestParamList>();
      await render(
        <ThemeProvider>
          <RunsProvider repository={repository} {...photoDeps()}>
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Run" component={RunStub} />
                <Stack.Screen
                  name="PhotoViewer"
                  component={PhotoViewerScreen}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </RunsProvider>
        </ThemeProvider>,
      );
      await waitFor(() => expect(navigationRef.isReady()).toBe(true));
      await act(async () => {
        navigationRef.navigate('PhotoViewer', {
          context: 'past_run',
          runId: 'old',
          attachmentId,
        });
      });
      return { navigationRef };
    }

    it('shows the photo with Close but no Remove, and logs the context', async () => {
      await renderPastViewer('att-9');

      await waitFor(() =>
        expect(screen.getByTestId('photo-viewer-image').props.source).toEqual({
          uri: expect.stringContaining('att-9.jpg'),
        }),
      );
      expect(screen.getByLabelText('Close')).toBeTruthy();
      expect(screen.queryByLabelText('Remove')).toBeNull();
      expect(analytics.logScreenView).toHaveBeenCalledWith(
        'screen_photo_viewer',
        { context: 'past_run', target: 'item' },
      );
    });

    it('closes when the photo is not in that run', async () => {
      const { navigationRef } = await renderPastViewer('missing');

      await waitFor(() =>
        expect(navigationRef.getCurrentRoute()?.name).toBe('Run'),
      );
    });
  });
});
