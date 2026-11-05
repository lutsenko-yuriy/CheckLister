import type {
  KillSwitchSource,
  RawSwitchValues,
} from '../shared/killSwitches/RemoteConfigKillSwitchSource';
import type { KillSwitchId } from '../shared/killSwitches/killSwitches';

type Listener = () => void;

// Scenario builds only (CheL-147): replaces Remote Config so flows set switch values
// through checklister://scenarios/... links instead of reading the production project.
export class ScenarioKillSwitchSource implements KillSwitchSource {
  private values: RawSwitchValues = {};
  private readonly listeners = new Set<Listener>();

  async loadActivated(): Promise<RawSwitchValues> {
    return { ...this.values };
  }

  // Values arrive by push, never by fetch.
  async fetchAndActivate(): Promise<boolean> {
    return false;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  set(id: KillSwitchId, raw: string): void {
    this.values = { ...this.values, [id]: raw };
    this.notify();
  }

  reset(): void {
    this.values = {};
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const scenarioKillSwitchSource = new ScenarioKillSwitchSource();
