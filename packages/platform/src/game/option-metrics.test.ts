import { expect,it } from 'vitest';
import { lineHeight } from '@kaki/ui';
import { optionLabelStep,textHeight,textWidth } from './option-metrics';

it.each(['Cretaceous-Paleogene','Triassic–Jurassic','alpha/beta','alpha‐beta','alpha‒beta','alpha\u200bbeta'])('wraps %s at browser break opportunities', label => {
  const pieces = label.split(/(?<=[-‐‒–—/\u200b])|(?=—)/u);
  const width = Math.max(...pieces.map(piece => textWidth(piece.replace(/\u200b/g,''),21)));
  expect(textHeight(label,21,width,true)).toBe(Math.ceil(2*21*lineHeight.body));
  expect(optionLabelStep(label,width+13,Math.ceil(3*21*lineHeight.body)+12)).toBe(21);
});

it('permits the browser break before an em dash', () => {
  const width = textWidth('—beta',21);
  expect(textHeight('alpha—beta',21,width,true)).toBe(Math.ceil(2*21*lineHeight.body));
  expect(optionLabelStep('alpha—beta',width+13,100)).toBe(21);
});

it.each(['W'.repeat(40),'alpha‑beta','alpha\u00a0beta','alpha\u202fbeta'])('rejects an unbreakable token: %s', label => {
  expect(textHeight(label,21,textWidth(label,21)-1,true)).toBe(Infinity);
  expect(optionLabelStep(label,textWidth(label,21)+11,200)).toBeNull();
});

it('keeps the three-line limit and 21 px minimum', () => {
  const width = textWidth('WW-',21);
  expect(optionLabelStep('WW-WW-WW-WW',width+13,200)).toBeNull();
  expect(optionLabelStep('W'.repeat(40),200,200)).toBeNull();
});

it.each(['Catch-22','A350-1000','85-92','3/4','-40'])('keeps numeric punctuation joined: %s', label => {
  expect(textHeight(label,21,textWidth(label,21)-1,true)).toBe(Infinity);
});
