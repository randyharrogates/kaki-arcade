import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { formatReport, readSources, runConformance, conformanceTimeout } from '@kaki/platform/kit';
import { tabaoRush } from './rules/game';
it('TR-064 picker conforms at 1, 4 and 8 cooks', {timeout:conformanceTimeout(15000)}, () => {
  const report = runConformance({ ...tabaoRush, init(...args) { const state = tabaoRush.init(...args); return { ...state, level: { ...state.level, roundSeconds: 5 } }; } },[1,4,8].map(players=>({name:`picker-${String(players)}`,players,steps:2000,script:({players:seats,layout})=> ({actions:seats.filter(p=>layout(p.id).controls.some(control=>control.kind==='options' && control.id==='ready' && control.options.some(option=>option.id==='ready' && option.state!=='selected'))).map(p=>({player:p.id,control:'ready',value:'ready'}))})})),{sources:readSources(fs,new URL('./rules/',import.meta.url).pathname)});
  expect(report.ok,formatReport(report)).toBe(true);
});
