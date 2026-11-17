import type { HostMessage } from '@kaki/protocol';
import { validatePhoneMessage } from '@kaki/protocol';
/** One view revision space shared by pre-game shell views and running sessions. */
export function viewChannel() {
  let revision = -1;
  let latest: { wire: number; source: number } | undefined;
  return {
    send(message: HostMessage, send: (message: HostMessage) => boolean): boolean {
      if (message.t !== 'view') return send(message);
      const wire = revision + 1;
      if (!send({ ...message, rev: wire })) return false;
      revision = wire; latest = { wire, source: message.rev }; return true;
    },
    receive(message: unknown): unknown {
      const checked = validatePhoneMessage(message);
      if (!checked.ok || checked.value.t !== 'action') return message;
      if (checked.value.viewRev !== latest?.wire) return null;
      return { ...checked.value, viewRev: latest.source };
    },
  };
}
