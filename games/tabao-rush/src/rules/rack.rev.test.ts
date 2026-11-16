import { required } from './review-fixture';
import { expect, it } from 'vitest';
import { actionPreview } from './items';
import { containerOf } from './recipes';
import { aimAt, cross, frame, setup, stationTiles, stepWith } from './review-fixture';
it('R16 each rack gives its own kind in one press and accepts only that clean empty kind', () => {
    for (const kind of ['plate', 'bowl', 'cup'] as const) {
        let s = setup(1, 3, false);
        const rack = required(stationTiles('dish-rack').find((t) => (required(required(s.stations)[t]).container ?? 'plate') === kind));
        s = { ...s, cooks: s.cooks.map((c) => aimAt(c, rack)) };
        expect(required(required(s.stations)[rack]).supply).toHaveLength(kind === 'plate' ? 4 : 2);
        expect(actionPreview(s, required(s.cooks[0])).cross).toBe(`take ${kind}`);
        s = stepWith(s, new Map([['p0', frame(0, cross)]]));
        expect(containerOf(required(s.inventory.held.p0))).toBe(kind);
        const held = required(s.inventory.held.p0);
        s = stepWith(s, new Map([['p0', frame(0, cross)]]));
        expect(s.inventory.held.p0).toBeUndefined();
        s = { ...s, inventory: { ...s.inventory, held: { p0: { ...held, container: kind === 'plate' ? 'cup' : 'plate' } } } };
        expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    }
});
