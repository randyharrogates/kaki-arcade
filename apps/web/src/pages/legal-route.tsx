import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { legalCopy, legalLinks } from './legal-copy';
import type { LegalPageName } from './legal-copy';
import './legal.css';
export function LegalPage({ page }: { page: LegalPageName }) {
  const copy = legalCopy[page];
  const back = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => { if (matchMedia('(min-width: 1001px)').matches) back.current?.focus({ preventScroll: true }); }, []);
  const reading = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(page === 'privacy' ? 2 : 1);
  useLayoutEffect(() => {
    const root = reading.current;
    if (!root || matchMedia('(max-width: 1000px)').matches) return;
    const columns = Array.from(root.querySelectorAll<HTMLElement>('.legal-column'));
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section'));
    const scale = root.getBoundingClientRect().width / root.offsetWidth;
    const firstColumn = columns[0];
    if (!firstColumn) return;
    const gap = parseFloat(getComputedStyle(firstColumn).gap);
    // Measure every section at both real column widths before paint. Only the
    // contiguous split changes; DOM and visual reading order stay the same.
    const heights = columns.map(column => sections.map(section => {
      const width = section.style.width;
      section.style.width = `${String(column.clientWidth)}px`;
      const height = section.getBoundingClientRect().height / scale;
      section.style.width = width;
      return height;
    }));
    const [leftHeights, rightHeights] = heights;
    if (!leftHeights || !rightHeights) return;
    let best = 1;
    let shortest = Infinity;
    for (let index = 1; index < sections.length; index++) {
      const left = leftHeights.slice(0, index).reduce((sum, height) => sum + height, 0) + gap * (index - 1);
      const right = rightHeights.slice(index).reduce((sum, height) => sum + height, 0) + gap * (sections.length - index - 1);
      if (Math.max(left, right) < shortest) { shortest = Math.max(left, right); best = index; }
    }
    setSplit(best);
  }, [page]);
  const groups = [copy.sections.slice(0, split), copy.sections.slice(split)];
  return <main class="legal-page ka-surface" data-theme="console">
    <article class="legal-reading ka-panel">
      <a ref={back} href="/">{legalLinks.home}</a><h1>{copy.title}</h1>
      <div ref={reading} class="legal-sections">{groups.map((group, index) => <div class="legal-column" key={index}>{group.map(section => <section key={section.title}>
        <h2>{section.title}</h2><p>{section.text}</p>
        {'links' in section && <div class="legal-links">{section.links.map(link => <a key={link.href} href={link.href} download={'download' in link ? link.download : undefined}>{link.label}</a>)}</div>}
      </section>)}</div>)}</div>
    </article>
  </main>;
}
