import { featureNames, supportCopy, unsupportedHeading } from './support';
import type { MissingFeature } from './support';
import './unsupported.css';
export function BrowserNotSupported({ pathname, missing }: { pathname: string; missing: MissingFeature[] }) {
  return <main class="unsupported ka-surface" data-theme="console">
    <h1>{unsupportedHeading}</h1>
    <p>{supportCopy(pathname)}</p>
    <p class="unsupported-details">Missing: {[...new Set(missing.map(name => featureNames[name]))].join(', ')}.</p>
  </main>;
}
