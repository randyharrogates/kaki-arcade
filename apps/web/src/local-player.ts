import { BUTTON, unitToAxis } from '@kaki/protocol';
import type { HostMessage, PhoneMessage } from '@kaki/protocol';
import type { HostInput } from '@kaki/netcode';
import type { Layout } from '@kaki/controller-kit';

export { LOCAL_CONNECTION } from '@kaki/platform';
const faces = ['face-bottom', 'face-right', 'face-left', 'face-top', 'shoulder-left', 'shoulder-right'] as const;
const bits = [BUTTON.faceBottom, BUTTON.faceRight, BUTTON.faceLeft, BUTTON.faceTop, BUTTON.l, BUTTON.r];
const keys = ['Space', 'KeyE', 'KeyQ', 'KeyR', 'KeyZ', 'KeyX'];
export function localMapping(layout: Layout, held: ReadonlySet<string>, pad: Pick<Gamepad, 'axes' | 'buttons'> | null, leader: boolean, frame = { buttons: 0, stickX: 0, stickY: 0, tilt: null }) {
  const controls = layout.controls;
  let x = Number(held.has('ArrowRight') || held.has('KeyD')) - Number(held.has('ArrowLeft') || held.has('KeyA'));
  let y = Number(held.has('ArrowDown') || held.has('KeyS')) - Number(held.has('ArrowUp') || held.has('KeyW'));
  const px = pad?.axes[0] ?? 0, py = pad?.axes[1] ?? 0;
  x = x || (Number.isFinite(px) && Math.abs(px) > 0.2 ? Math.max(-1, Math.min(1, px)) : 0);
  y = y || (Number.isFinite(py) && Math.abs(py) > 0.2 ? Math.max(-1, Math.min(1, py)) : 0);
  const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
  let buttons = 0;
  let stick = false;
  for (const control of controls) {
    if (control.audience && control.audience !== 'everyone' && (control.audience === 'leader') !== leader) continue;
    if (control.kind === 'stick') stick = true;
    if (control.kind === 'dpad') {
      if (y < 0) buttons |= BUTTON.up; if (y > 0) buttons |= BUTTON.down;
      if (x < 0) buttons |= BUTTON.left; if (x > 0) buttons |= BUTTON.right;
    }
    if (control.kind === 'button' && !control.disabled) {
      const index = faces.indexOf(control.button);
      if (index >= 0 && ((held.has(keys[index] ?? '') || (index === 0 && held.has('Enter'))) || pad?.buttons[index]?.pressed)) buttons |= bits[index] ?? 0;
    }
  }
  frame.buttons = buttons; frame.stickX = stick ? unitToAxis(x) : 0; frame.stickY = stick ? unitToAxis(y) : 0;
  return frame;
}
/** Has no renderer and never retains a private view. Uses the phone HostInput receiver. */
export function localPlayer() {
  let layout: Layout = { revision: 0, controls: [] };
  let input: HostInput | undefined;
  let sequence = 0;
  let primaryHeld: boolean | undefined;
  let skipHeld = true;
  let viewRevision: number | null = null;
  let control: ((message: PhoneMessage) => void) | undefined;
  let leader = false;
  const frame = { buttons: 0, stickX: 0, stickY: 0, tilt: null, seq: 0, history: Array<number>(8).fill(0) };
  return {
    sendHost(message: HostMessage): boolean {
      if (message.t === 'layout') layout = message.layout as unknown as Layout;
      if (message.t === 'view') viewRevision = message.rev;
      if (message.t === 'room') leader = message.leader;
      return true;
    },
    bindControl(send: (message: PhoneMessage) => void) { control = send; },
    bindIdentity() { /* Room authentication is still performed by createReconnectRoom. */ },
    bindInput(next: HostInput) { input = next; primaryHeld = undefined; },
    close() { input?.pause(); input = undefined; layout = { revision: 0, controls: [] }; primaryHeld = undefined; viewRevision = null; control = undefined; },
    tick(held: ReadonlySet<string>, pad: Pick<Gamepad, 'axes' | 'buttons'> | null) {
      if (!input) return;
      const pressed = held.has('Space') || held.has('Enter') || pad?.buttons[0]?.pressed === true;
      if (pressed && primaryHeld === false) {
        const primary = layout.controls.find(part => part.id !== 'header-action' && part.kind === 'options' && part.options.length === 1 && (!part.audience || part.audience === 'everyone' || (part.audience === 'leader') === leader));
        if (primary?.kind === 'options' && primary.options[0]?.state !== 'disabled') {
          control?.({ v: 1, t: 'action', rev: layout.revision, viewRev: viewRevision, data: { control: primary.id, value: primary.options[0]?.id ?? '' } });
        }
      }
      primaryHeld = pressed;
      const skip = held.has('KeyK') || pad?.buttons[8]?.pressed === true;
      const header = layout.controls.find(part => part.id === 'header-action' && part.kind === 'options' && part.options.length === 1 && (!part.audience || part.audience === 'everyone' || (part.audience === 'leader') === leader));
      if (skip && !skipHeld && header?.kind === 'options' && header.options[0]?.state !== 'disabled') control?.({ v: 1, t: 'action', rev: layout.revision, viewRev: viewRevision, data: { control: header.id, value: header.options[0]?.id ?? '' } });
      skipHeld = skip;
      localMapping(layout, held, pad, leader, frame);
      frame.seq = sequence++ % 65536; frame.history.fill(frame.buttons);
      input.receiveInput(frame);
      return frame;
    },
  };
}

/** The keyboard timer owns unbound input; the pad poll owns bound input. */
export function tickLocalInput(source: 'keyboard' | 'gamepad', binding: number | undefined, player: Pick<ReturnType<typeof localPlayer>, 'tick'>, held: ReadonlySet<string>, pad: Gamepad | null): void {
  if ((source === 'gamepad') === (binding !== undefined)) player.tick(held, pad);
}
