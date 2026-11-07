import type { ScenarioPhotoResult } from './ScenarioPhotoPicker';
import { parseAbsoluteUrl } from '../shared/links/externalLinkUrls';
import {
  KILL_SWITCHES,
  KillSwitchId,
  parseRemoteSwitch,
} from '../shared/killSwitches/killSwitches';

export type ScenarioCommand =
  | { type: 'kill-switch'; id: KillSwitchId; raw: string }
  | { type: 'reset' }
  | { type: 'analytics' }
  | { type: 'analytics-clear' }
  | { type: 'photo-picker'; result: ScenarioPhotoResult }
  | { type: 'unknown' };

const PHOTO_PICKER_RESULTS: readonly string[] = [
  'picked',
  'denied',
  'cancelled',
];

const UNKNOWN: ScenarioCommand = { type: 'unknown' };

/** Null when the URL is not a scenario link at all; `unknown` when it is a bad one. */
export function parseScenarioLink(url: string): ScenarioCommand | null {
  const parsed = parseAbsoluteUrl(url);
  if (
    !parsed ||
    parsed.protocol !== 'checklister:' ||
    parsed.hostname !== 'scenarios'
  ) {
    return null;
  }

  const path = parsed.pathname.replace(/^\/|\/$/g, '');
  if (path === 'kill-switch/reset') {
    return { type: 'reset' };
  }
  if (path === 'analytics') {
    return { type: 'analytics' };
  }
  if (path === 'analytics/clear') {
    return { type: 'analytics-clear' };
  }
  if (path === 'photo-picker') {
    const result = parsed.searchParams.get('result');
    return result !== null && PHOTO_PICKER_RESULTS.includes(result)
      ? { type: 'photo-picker', result: result as ScenarioPhotoResult }
      : UNKNOWN;
  }
  if (path !== 'kill-switch') {
    return UNKNOWN;
  }

  const id = parsed.searchParams.get('id');
  const enabled = parsed.searchParams.get('enabled');
  const minVersion = parsed.searchParams.get('min_version') ?? '0.0.0';
  if (
    id === null ||
    !Object.prototype.hasOwnProperty.call(KILL_SWITCHES, id) ||
    (enabled !== 'true' && enabled !== 'false')
  ) {
    return UNKNOWN;
  }

  const raw = JSON.stringify({
    enabled: enabled === 'true',
    min_version: minVersion,
  });
  return parseRemoteSwitch(raw)
    ? { type: 'kill-switch', id: id as KillSwitchId, raw }
    : UNKNOWN;
}
