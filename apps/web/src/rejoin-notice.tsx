import { Overlap } from './Overlap';
import type { LobbyInput } from './view-model';

/** PLAT-034: shared above lobby, play and pause surfaces. */
export function RejoinNotice({ notice }: { notice: LobbyInput['rejoinNotice'] }) {
  return <div class="host-rejoin-notice screen"><Overlap fade tempo="base" identity={String(notice?.id ?? 'empty')}>{notice && <p class="ka-panel" role="status">{notice.text}</p>}</Overlap></div>;
}
