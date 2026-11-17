// Built-in examples are statically registered so existing root checks also see their
// .mjs implementations. Other slice names are loaded by the runner from uat/slices.
import hostLobby from '../../uat/slices/C-07-host-lobby.mjs';
import joinPage from '../../uat/slices/C-08-join-page.mjs';
import type { Harness } from './harness.js';
export const builtInSlices: Record<string, ((harness: Harness) => Promise<void>) | undefined> = {
  'C-07-host-lobby': hostLobby,
  'C-08-join-page': joinPage,
};
