/** Containers whose own content, children and text must remain within their bounds. */
export const OVERFLOW_SELECTORS = [
  '.rz-question', '.rz-question h1', '.rz-question .rz-copy',
  '.rz-header', '.rz-header .rz-copy', '.rz-seat-number', '.rz-group-label', '.rz-frame', '.rz-no-team', '.rz-player-name', '.rz-row-team', '.rz-score-area', '.rz-round-label', '.rz-column-headings', '.rz-team-panel',
  '.rz-ranked-region', '.rz-option', '.rz-results', '.rz-results-body', '.rz-rank', '.rz-rank-name',
  '.rz-place', '.rz-total', '.rz-delta', '.rz-team-totals', '.rz-podium',
  '.rz-team-mark', '.rz-step', '.rz-step-place', '.rz-step-members', '.rz-podium-player', '.rz-podium-name', '.rz-solo', '.rz-solo-total',
] as const;

/** Hidden name ranges are expected only when the specified ellipsis is installed. */
function ellipsized(element: Element | null) {
  if (!element || !(element.classList.contains('rz-rank-name') || element.classList.contains('rz-podium-name'))) return false;
  const style = getComputedStyle(element);
  return style.overflow === 'hidden' && style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap';
}

const intersects = (a: Box, b: Box, tolerance: number) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;

type Box = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>;
const rounded = (box: Box) => Object.fromEntries(
  (['top', 'bottom', 'left', 'right'] as const).map(edge => [edge, Math.round(box[edge] * 10) / 10]));
const label = (element: Element) => element.className || ('tagName' in element ? element.tagName.toLowerCase() : '(anonymous element)');

/** Range includes font leading. For single-line header text, compare the loaded
 * face's ink bounds instead; no part of the ink is excused past a mask. */
function headerInk(element: Element, boxes: Box[], text: string, scale: number) {
  if (!('closest' in element) || !element.closest('.rz-header') || boxes.length !== 1 || !('createElement' in document)) return boxes;
  const style = getComputedStyle(element);
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return boxes;
  context.font = `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText(text);
  if (![metrics.fontBoundingBoxAscent, metrics.actualBoundingBoxAscent, metrics.actualBoundingBoxDescent,
    metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxRight].every(Number.isFinite)) return boxes;
  return boxes.map(box => {
    const baseline = box.top + metrics.fontBoundingBoxAscent * scale;
    return { top: baseline - metrics.actualBoundingBoxAscent * scale,
      bottom: baseline + metrics.actualBoundingBoxDescent * scale,
      left: box.left - metrics.actualBoundingBoxLeft * scale,
      right: box.left + metrics.actualBoundingBoxRight * scale };
  });
}

/** Only the outgoing and incoming branches of the same copy mask may overlap. */
export function swapPartners(element: Element, other: Element) {
  const mask = 'closest' in element ? element.closest('.rz-copy') : null;
  if (!mask || mask !== ('closest' in other ? other.closest('.rz-copy') : null)) return false;
  const branch = (node: Element) => {
    let current = node;
    while (current.parentElement && current.parentElement !== mask) current = current.parentElement;
    return current;
  };
  const a = branch(element), b = branch(other);
  return a !== b && (a.classList.contains('rz-old') || b.classList.contains('rz-old'));
}

export function detectOverflow(root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLElement>(OVERFLOW_SELECTORS.join(','))].filter(card => !card.closest('[inert]')).flatMap((card, index) => {
    const bounds = card.getBoundingClientRect();
    // DOM and Range rectangles are viewport pixels; scroll/client sizes are CSS
    // pixels. Derive the uniform screen transform from its untransformed frame.
    const frameElement = card.closest<HTMLElement>('.rz-frame');
    const scale = frameElement?.offsetWidth ? frameElement.getBoundingClientRect().width / frameElement.offsetWidth : 1;
    const tolerance = Math.max(1, scale);
    const outside = (box: Box) => box.left < bounds.left - tolerance || box.top < bounds.top - tolerance || box.right > bounds.right + tolerance || box.bottom > bounds.bottom + tolerance;
    const visible = (element: Element) => {
      for (let current: Element | null = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (('getAttribute' in current && (current.getAttribute('aria-hidden') === 'true' || current.getAttribute('role') === 'presentation' || current.getAttribute('role') === 'none')) || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0' || ('inert' in current && current.inert === true)) return false;
      }
      const box = element.getBoundingClientRect();
      return box.right > box.left && box.bottom > box.top;
    };
    // Display line-height 1 can leave the font's ascent/descent outside its
    // line box. Visible ink is harmful only if clipped, colliding or unsafe.
    const peers = [...(frameElement ?? root).querySelectorAll<HTMLElement>('*')].filter(peer => {
      if (!visible(peer)) return false;
      const box = peer.getBoundingClientRect();
      const frame = frameElement?.getBoundingClientRect();
      if (frame && box.left <= frame.left + tolerance && box.top <= frame.top + tolerance &&
        box.right >= frame.right - tolerance && box.bottom >= frame.bottom - tolerance) return false;
      // Own text only: a wrapper around text elsewhere is not another obstacle.
      const ownText = [...('childNodes' in peer ? peer.childNodes : [])].some(node => node.nodeType === 3 && !!node.textContent?.trim());
      return ownText || ('matches' in peer && peer.matches('button, input, select, textarea, a[href], img, svg, [role="button"], [role="img"], .rz-option, .rz-card-box, .rz-media, .rz-rank, .rz-step-place, .rz-team-panel'));
    });
    // Frame padding is a layout margin; visible ink may extend into it.
    const artboard = card.closest('.rz-artboard');
    const safeBounds = (artboard ?? frameElement)?.getBoundingClientRect();
    const leavesSafeArea = (box: Box) => !!safeBounds && (
      box.left < safeBounds.left - tolerance || box.top < safeBounds.top - tolerance ||
      box.right > safeBounds.right + tolerance || box.bottom > safeBounds.bottom + tolerance);
    const related = (element: Element, other: Element) => {
      for (let current: Element | null = element; current; current = current.parentElement) {
        if (current === other) return true;
      }
      return false;
    };
    const comparisons: { element: string; measured: ReturnType<typeof rounded>; boundsElement: string; bounds: ReturnType<typeof rounded>; verticalAllowance: number; tolerance: number }[] = [];
    const compare = (element: Element, box: Box, boundary: Element, limit: Box, allowance = 0, slack = tolerance) => {
      comparisons.push({ element: label(element), measured: rounded(box), boundsElement: label(boundary), bounds: rounded(limit), verticalAllowance: Math.round(allowance * 10) / 10, tolerance: slack });
    };
    const harmful = (element: Element, boxes: Box[]) => {
      let clipped = false;
      for (let current: Element | null = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        const hidden = (value: string) => !!value && value !== 'visible';
        if ([style.overflow, style.overflowX, style.overflowY].some(hidden) || style.textOverflow === 'ellipsis') {
          const limit = current.getBoundingClientRect();
          const allowance = 0;
          const slack = tolerance;
          for (const box of boxes) {
            compare(element, box, current, limit, allowance, slack);
            if (style.textOverflow === 'ellipsis' ||
              (hidden(style.overflowX || style.overflow) && (box.left < limit.left - slack || box.right > limit.right + slack)) ||
              (hidden(style.overflowY || style.overflow) && (box.top < limit.top - allowance - slack || box.bottom > limit.bottom + allowance + slack))) clipped = true;
          }
        }
        if (current === frameElement) break;
      }
      for (const box of boxes) {
        const safeElement = artboard ?? frameElement;
        if (safeBounds && safeElement) compare(element, box, safeElement, safeBounds);
        if (leavesSafeArea(box)) clipped = true;
        for (const peer of peers) if (peer !== element && !related(element, peer) && !related(peer, element) && !swapPartners(element, peer) && visible(peer)) {
          const limit = peer.getBoundingClientRect();
          if (intersects(box, limit, tolerance)) { compare(element, box, peer, limit); clipped = true; }
        }
      }
      return clipped;
    };
    const finding = (element: Element, kind: string, reason: string, boxes: Box[], boundary: Element = card, limit: Box = bounds) => {
      for (const box of boxes) compare(element, box, boundary, limit);
      const result = { card: index, element: reason === 'text outside bounds' ? label(card) : label(element), kind, reason, comparisons: [...comparisons] };
      comparisons.length = 0;
      return result;
    };
    const textBoxes: Box[] = [];
    const failures = [...card.querySelectorAll<HTMLElement>('*')].filter(child => outside(child.getBoundingClientRect())).map(child => finding(child, 'overflow', 'child outside bounds', [child.getBoundingClientRect()]));
    if (card.classList.contains('rz-frame') && artboard) {
      const frame = artboard.getBoundingClientRect();
      if (bounds.left < frame.left - tolerance || bounds.top < frame.top - tolerance || bounds.right > frame.right + tolerance || bounds.bottom > frame.bottom + tolerance)
        failures.push(finding(card, 'overflow', 'frame outside artboard', [bounds], artboard, frame));
    }
    if (ellipsized(card) && card.scrollWidth > card.clientWidth + 1)
      failures.push(finding(card, 'truncated', 'name ellipsised', [{ left: bounds.left, top: bounds.top, right: bounds.left + card.scrollWidth * scale, bottom: bounds.bottom }]));
    // Range geometry sees text overflowing its span even when the span itself fits.
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      // Ellipsis is intentional only on the bounded player-name span. Check its
      // box above, but do not count the browser's hidden text range as visible ink.
      if (ellipsized(node.parentElement?.closest('.rz-rank-name, .rz-podium-name') ?? null)) { node = walker.nextNode(); continue; }
      const range = document.createRange();
      range.selectNodeContents(node);
      const boxes = headerInk(node.parentElement ?? card, [...range.getClientRects()], node.textContent ?? '', scale);
      textBoxes.push(...boxes);
      const overhang = boxes.filter(outside);
      if (overhang.length) failures.push(finding(node.parentElement ?? card, harmful(node.parentElement ?? card, overhang) ? 'overflow' : 'overhang', 'text outside bounds', overhang));
      node = walker.nextNode();
    }
    if (card.scrollHeight > card.clientHeight + 1 || (!ellipsized(card) && card.scrollWidth > card.clientWidth + 1)) {
      const boxes = textBoxes.length ? textBoxes : [{ left: bounds.left, top: bounds.top, right: bounds.left + card.scrollWidth * scale, bottom: bounds.top + card.scrollHeight * scale }];
      const kind = harmful(card, boxes) ? 'overflow' : 'overhang';
      compare(card, { left: bounds.left, top: bounds.top, right: bounds.left + card.scrollWidth * scale, bottom: bounds.top + card.scrollHeight * scale },
        card, { left: bounds.left, top: bounds.top, right: bounds.left + card.clientWidth * scale, bottom: bounds.top + card.clientHeight * scale }, 0, scale);
      failures.push(finding(card, kind, 'scroll overflow', boxes));
    }
    if (['rz-rank', 'rz-step', 'rz-podium', 'rz-podium-player', 'rz-podium-name', 'rz-player-name', 'rz-score-area'].some(name => card.classList.contains(name))) {
      const children = [...card.children];
      children.forEach((child, i) => {
        const a = child.getBoundingClientRect();
        for (const sibling of children.slice(i + 1)) {
          const b = sibling.getBoundingClientRect();
          if (intersects(a, b, tolerance))
            failures.push(finding(child, 'overflow', 'sibling overlap', [a], sibling, b));
        }
      });
    }
    return failures;
  });
}
