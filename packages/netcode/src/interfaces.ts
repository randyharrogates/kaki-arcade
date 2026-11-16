import type { CandidateStep, IceGrant } from '@kaki/protocol';

/** All time is monotonic milliseconds. Cancellation must tolerate an already fired task. */
export interface Scheduler {
  now(): number;
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}
export interface Socket {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}
export type SocketFactory = (url: string, protocols: string[]) => Socket;
export interface Channel {
  readonly label: string;
  readonly readyState: string;
  binaryType: string;
  readonly bufferedAmount: number;
  onerror: (() => void) | null;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string | Uint8Array): void;
  close(): void;
}
export interface Description { type: 'offer' | 'answer'; sdp: string }
export interface Candidate { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }
export interface Stat {
  id: string;
  type: string;
  selectedCandidatePairId?: string;
  localCandidateId?: string;
  remoteCandidateId?: string;
  candidateType?: string;
  nominated?: boolean;
  state?: string;
}
export interface PeerConnection {
  readonly connectionState: string;
  onconnectionstatechange: (() => void) | null;
  onicecandidate: ((event: { candidate: Candidate | null }) => void) | null;
  ondatachannel: ((event: { channel: Channel }) => void) | null;
  createDataChannel(label: string, options: { ordered: boolean; maxRetransmits?: number }): Channel;
  createOffer(): Promise<Description>;
  createAnswer(): Promise<Description>;
  setLocalDescription(description: Description): Promise<void>;
  setRemoteDescription(description: Description): Promise<void>;
  addIceCandidate(candidate: Candidate | null): Promise<void>;
  getStats?(): Promise<ReadonlyMap<string, Stat>>;
  close(): void;
}
export interface IceConfiguration {
  iceServers: { urls: string[]; username?: string; credential?: string }[];
}
export type PeerFactory = (configuration: IceConfiguration) => PeerConnection;
export function iceConfiguration(grant: IceGrant): IceConfiguration {
  return { iceServers: grant.servers.map((server) => ({
    urls: server.urls,
    ...(server.username === null ? {} : { username: server.username }),
    ...(server.credential === null ? {} : { credential: server.credential }),
  })) };
}
export function candidateFromStep(step: CandidateStep): Candidate {
  return { candidate: step.candidate, sdpMid: step.mid, sdpMLineIndex: step.mLineIndex };
}
