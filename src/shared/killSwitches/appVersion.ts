import { version } from '../../../package.json';

// package.json is the version source of truth; native versions aren't synced.
export const APP_VERSION: string = version;
