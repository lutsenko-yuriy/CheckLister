import { Alert } from 'react-native';
import { recordingAnalyticsService } from './RecordingAnalyticsService';
import { scenarioKillSwitchSource } from './ScenarioKillSwitchSource';
import { scenarioPhotoPicker } from './ScenarioPhotoPicker';
import { parseScenarioLink } from './scenarioLinks';

/** Scenario builds only. True when the URL was a scenario link (valid or not). */
export function handleScenarioLink(
  url: string,
  openEvents: () => void,
): boolean {
  const command = parseScenarioLink(url);
  if (command === null) {
    return false;
  }
  switch (command.type) {
    case 'kill-switch':
      scenarioKillSwitchSource.set(command.id, command.raw);
      break;
    case 'reset':
      scenarioKillSwitchSource.reset();
      break;
    case 'analytics':
      openEvents();
      break;
    case 'analytics-clear':
      recordingAnalyticsService.clear();
      break;
    case 'photo-picker':
      scenarioPhotoPicker.setResult(command.result);
      break;
    default:
      Alert.alert('Unknown scenario command');
  }
  return true;
}
