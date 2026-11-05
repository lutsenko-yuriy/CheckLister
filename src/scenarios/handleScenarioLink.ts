import { Alert } from 'react-native';
import { scenarioKillSwitchSource } from './ScenarioKillSwitchSource';
import { parseScenarioLink } from './scenarioLinks';

/** Scenario builds only. True when the URL was a scenario link (valid or not). */
export function handleScenarioLink(url: string): boolean {
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
    default:
      Alert.alert('Unknown scenario command');
  }
  return true;
}
