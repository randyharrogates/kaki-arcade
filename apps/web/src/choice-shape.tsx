import { SHAPE_STROKE } from '@kaki/ui';
export function ChoiceShape({ circle = false }: { circle?: boolean }) {
  return <svg stroke-width={SHAPE_STROKE} class={`result-shape ${circle ? 'circle' : 'cross'}`} viewBox="0 0 24 24" aria-hidden="true">{circle ? <circle cx="12" cy="12" r="8"/> : <path d="M5 5l14 14M19 5L5 19"/>}</svg>;
}
