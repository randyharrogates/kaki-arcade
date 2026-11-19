import type { HostMessage } from '@kaki/protocol';
import { validatePhoneMessage } from '@kaki/protocol';
/** One view revision space shared by pre-game shell views and running sessions. */
export function viewChannel() {
  let revision = -1;
  let latest: { wire: number; source: number } | undefined;
  return {
    send(message: HostMessage, send: (message: HostMessage, revisioned?: boolean) => boolean): boolean {
      if (message.t !== 'view') return send(message);
      // room-players is a reserved view kind.
      if (message.view && typeof message.view === 'object' && !Array.isArray(message.view) && message.view.kind === 'room-players') return send(message, false);
      const wire = revision + 1;
      if (!send({ ...message, rev: wire })) return false;
      revision = wire; latest = { wire, source: message.rev }; return true;
    },
    receive(message: unknown): unknown {
      const checked = validatePhoneMessage(message);
      if (!checked.ok || checked.value.t !== 'action') return message;
      // Removal addresses a room seat, independently of any game/private view.
      // The room reducer authenticates the connected actor and current leader.
      const { data, viewRev } = checked.value;
      if (viewRev === null && data && typeof data === 'object' && !Array.isArray(data) && data.control === 'remove-player') return checked.value;
      if (viewRev !== latest?.wire) return null;
      return { ...checked.value, viewRev: latest.source };
    },
  };
}
