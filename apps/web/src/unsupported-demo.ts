import { featureNames } from './support';
import type { MissingFeature } from './support';
/** Development-only fixture; loaded behind import.meta.env.DEV. */
export function unsupportedDemo(search: string): MissingFeature[] {
  const params = new URLSearchParams(search);
  if (params.get('demo') !== 'unsupported') return [];
  return (params.get('missing') ?? 'webrtc').split(',').filter((name): name is MissingFeature => Object.hasOwn(featureNames, name));
}
