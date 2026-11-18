"""TR-041 geometry/material regressions, no Blender or source asset writes."""
import importlib.util
import math
import itertools
import os
import copy
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from PIL import Image
import item_sheet
import item_projection

spec = importlib.util.spec_from_file_location('items_polish', Path(__file__).parents[1]/'blender/items.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ItemPolishTests(unittest.TestCase):
    def capture(self, build):
        calls = []
        def primitive(kind):
            def record(*args):
                obj = SimpleNamespace(rotation_euler=SimpleNamespace(z=0))
                calls.append((kind, args, obj))
                return obj
            return record
        with patch.object(m, 'model', SimpleNamespace(children=[]), create=True), \
                patch.object(m, 'ball', primitive('ball')), \
                patch.object(m, 'box', primitive('box')), \
                patch.object(m, 'strand', primitive('strand')), \
                patch.object(m, 'rice_ribbon', primitive('ribbon')):
            build()
        return calls

    def test_rojak_is_bounded_mound_with_dough_sauce_and_peanuts(self):
        dough, sauce, peanuts = m.rojak_topping()
        self.assertGreaterEqual(len(dough)+len(sauce)+len(peanuts), 20)
        self.assertGreaterEqual(len(dough), 4)
        self.assertEqual({part[0] for part in m.rojak_mix()}, {'pineapple','cucumber','turnip'})
        self.assertGreaterEqual(len(m.rojak_mix())+len(dough), 10)
        for _,loc,size,_,_ in m.rojak_mix():
            self.assertLess(math.hypot(*loc[:2])+max(size[:2]), .29)
        self.assertGreaterEqual(len(peanuts), 8)
        self.assertGreater(max(loc[2] for loc,_ in sauce), .06)
        for loc, size in sauce:
            self.assertLess(math.hypot(*loc[:2])+max(size[:2]), .29)
            self.assertGreaterEqual(min(size[:2]), .06)  # broad patches, not twigs
        calls = self.capture(lambda: m.portion('rojak-dressing', 'clean'))
        self.assertFalse(any(kind == 'strand' for kind,_,_ in calls))
        self.assertEqual(sum(kind == 'box' for kind,_,_ in calls), len(dough)+len(peanuts)+len(m.rojak_mix()))
        self.assertEqual(set(food for food,_,_ in m.DISH_PARTS['rojak'][1]),
                         {'pineapple','turnip','cucumber','rojak-dressing'})
        self.assertEqual(m.DISH_PARTS['rojak'][0], 'plate')
        self.assertTrue(all(p[0][2] > 0 for p in peanuts))

    def test_rojak_portions_have_five_percent_visible_geometry(self):
        shares = item_projection.portion_shares(m)
        print('Rojak projected visible shares:', [round(s, 6) for s in shares])
        for (food, _, _), share in zip(m.DISH_PARTS['rojak'][1], shares):
            self.assertGreaterEqual(share, .05, food)

    def test_all_dish_portions_break_composition_with_margin(self):
        for dish in m.DISHES:
            predictions = item_projection.dish_prediction(m,dish)
            print('Predicted composition', dish, [{k:v for k,v in p.items() if k != 'scores'} for p in predictions])
            for part in predictions:
                with self.subTest(dish=dish,food=part['food']):
                    self.assertGreater(part['share'], .05)
                    self.assertGreater(part['drop'], 7.5)
                    self.assertGreater(part['shiftMin'], 6)

    def test_round3_chicken_fails_new_mean_difference_guard(self):
        def round3():
            return [(((i-2)*.075, .018*abs(i-2), .052+i*.009),
                     (.13, .20-abs(i-2)*.008, .03), (i-2)*.18)
                    for i in range(5)]
        old_portions = dict(m.PORTIONS, chicken=(('chopped',),(.10,-.09,.07),.55))
        with patch.object(m,'chicken_slices',round3), patch.object(m,'PORTIONS',old_portions), \
                patch.object(m,'CHICKEN_BAND_WIDTH',.018):
            chicken = item_projection.dish_prediction(m,'chicken-rice')[1]
        print('Round 3 chicken prediction',chicken)
        # The identical positive guard used for current geometry must reject round 3.
        with self.assertRaises(AssertionError):
            self.assertGreater(chicken['drop'], 7.5)

    def test_rojak_chicken_rice_projected_icon_smoke(self):
        score = item_projection.icon_iou(m)
        print('Chicken rice / rojak predicted icon IoU:', round(score, 6))
        self.assertLessEqual(score, .75)  # >= .15 below the .90 distinctness limit

    def test_all_projected_icon_pairs(self):
        masks = item_projection.icon_masks(m)
        closest = (0,None,None)
        for (left,a),(right,b) in itertools.combinations(masks.items(),2):
            score = len(a&b)/len(a|b)
            closest = max(closest,(score,left,right))
            with self.subTest(left=left,right=right):
                self.assertLess(score,.75)
        print('Projected closest icons:',closest)

    def test_chicken_stays_inside_plate_footprint(self):
        ox,oy,_ = m.PORTIONS['chicken'][1]
        for obj in item_projection.primitives(m,'chicken','chopped'):
            angle = obj.rotation_euler.z
            for x in (-obj.size[0]/2,obj.size[0]/2):
                for y in (-obj.size[1]/2,obj.size[1]/2):
                    px = (x*math.cos(angle)-y*math.sin(angle))*obj.scale[0]+obj.location[0]+ox
                    py = (x*math.sin(angle)+y*math.cos(angle))*obj.scale[1]+obj.location[1]+oy
                    self.assertLess(math.hypot(px,py),.31)

    def test_every_committed_icon_pair_smoke(self):
        masks = {}
        for dish in m.DISHES:
            with Image.open(item_sheet.ROOT/f'assets/src/tabao-rush/items/icon-{dish}.png') as image:
                masks[dish] = {i for i,p in enumerate(image.convert('RGBA').getdata()) if p[3] >= 128}
        for (left,a),(right,b) in itertools.combinations(masks.items(), 2):
            with self.subTest(left=left, right=right):
                self.assertLess(len(a & b)/len(a | b), .75)

    def test_turnip_has_warm_cuboid_faces_and_edges_at_plate_scale(self):
        chunks = m.turnip_chunks()
        self.assertGreaterEqual(len(chunks), 7)
        for _, size, _ in chunks:
            self.assertGreaterEqual(min(size), .07)
            self.assertLessEqual(max(size)/min(size), 1.5)
            self.assertGreaterEqual(min(size[:2])*120*m.PORTIONS['turnip'][2], 8)
        self.assertGreater(m.colour_contrast(m.TURNIP_EDGE, m.CERAMIC), 2)
        self.assertGreater(m.colour_contrast(m.TURNIP_SKIN, m.TURNIP_FACE), 1.5)
        calls = self.capture(lambda: m.ingredient('turnip','chopped'))
        self.assertEqual(len(calls), len(chunks)*3)
        self.assertEqual({args[2] for _,args,_ in calls}, {m.TURNIP_EDGE,m.TURNIP_FACE,m.TURNIP_SKIN})

    def test_chicken_has_five_low_fanned_slices_and_skin(self):
        slices = m.chicken_slices()
        self.assertEqual(len(slices), 5)
        self.assertGreater(max(p[2] for p in slices)-min(p[2] for p in slices), .7)
        for _, size, _ in slices:
            self.assertGreaterEqual(size[0]/size[2], 2)
            self.assertLessEqual(size[1]/size[0], 2)
            self.assertGreater(size[0]*120*m.PORTIONS['chicken'][2], 4)
        self.assertGreaterEqual(m.CHICKEN_BAND_WIDTH, .03)
        self.assertTrue(all(a[0][2] < b[0][2] for a,b in zip(slices,slices[1:])))
        calls = self.capture(lambda: m.ingredient('chicken','chopped'))
        self.assertEqual(len(calls), 10)
        self.assertEqual(sum(args[2] == m.CHICKEN_SKIN for _,args,_ in calls), 5)
        self.assertEqual({obj.rotation_euler.z for _,_,obj in calls}, {p[2] for p in slices})

        # Band spans local Y (length), offset to local +X (one long edge).
        for (_,cut,_), (_,skin,obj) in zip(calls[::2], calls[1::2]):
            loc,size,_ = cut
            band_loc,band_size,_ = skin
            self.assertAlmostEqual(band_size[1], size[1])
            self.assertLess(band_size[0], size[0]/4)
            dx,dy = band_loc[0]-loc[0],band_loc[1]-loc[1]
            angle = obj.rotation_euler.z
            self.assertAlmostEqual(-dx*math.sin(angle)+dy*math.cos(angle), 0)
            self.assertAlmostEqual(dx*math.cos(angle)+dy*math.sin(angle), size[0]/2-m.CHICKEN_BAND_WIDTH/2)

    def test_turnip_options_and_default(self):
        for option in (None, 'tan', 'cream', 'lilac'):
            with patch.dict(os.environ, {}, clear=False):
                os.environ.pop('KAKI_TURNIP_STYLE', None)
                if option:
                    os.environ['KAKI_TURNIP_STYLE'] = option
                candidate = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(candidate)
            self.assertEqual(candidate.TURNIP_STYLE, option or 'cream')
            self.assertGreater(candidate.colour_contrast(candidate.TURNIP_EDGE, candidate.CERAMIC), 2)
            self.assertGreater(candidate.colour_contrast(candidate.TURNIP_SKIN, candidate.TURNIP_FACE), 1.5)
        with patch.dict(os.environ, {'KAKI_TURNIP_STYLE': 'invalid'}):
            with self.assertRaisesRegex(ValueError, 'tan, cream or lilac'):
                spec.loader.exec_module(importlib.util.module_from_spec(spec))

    def test_metadata_refresh_repairs_pixels_and_is_idempotent(self):
        config = json.loads((item_sheet.ROOT/'assets/src/pipeline.json').read_text())
        expected = copy.deepcopy(config)
        group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')
        group['containmentFootprints'] = {}
        for frame in group['frames']:
            frame['bakedOutline'] = False
        item_sheet.pipeline.refresh_item_metadata(config, item_sheet.ROOT/'assets/src')
        expected_group = next(g for g in expected['sets'] if g['id'] == 'tabao-rush-items')
        self.assertEqual(group['containmentFootprints'], expected_group['containmentFootprints'])
        for actual, original in zip(group['frames'], expected_group['frames']):
            self.assertEqual(actual['bakedOutline'], original.get('bakedOutline', False))
        snapshot = copy.deepcopy(config)
        item_sheet.pipeline.refresh_item_metadata(config, item_sheet.ROOT/'assets/src')
        self.assertEqual(config, snapshot)

    def test_every_broth_serving_has_rim_and_recipe_has_bowl(self):
        for ident, (container, parts) in m.DISH_PARTS.items():
            if any(food.endswith('broth') for food,_,_ in parts):
                self.assertEqual(container, 'bowl', ident)
        calls = self.capture(lambda: m.portion('laksa-broth','cooked'))
        rims = [args for kind,args,_ in calls if kind == 'strand']
        self.assertEqual(len(rims), 1)
        points, colour, width = rims[0]
        self.assertEqual(colour, m.CERAMIC)
        for a, b in zip(points[0], points[-1]):
            self.assertAlmostEqual(a,b)
        self.assertGreaterEqual(m.BROTH_RIM_RADIUS-width, m.BROTH_RADIUS)
        self.assertGreaterEqual(width*2*120*.36, .8)
        self.assertEqual(len(points), 49)
        for point in points:
            self.assertAlmostEqual(math.hypot(*point[:2]), m.BROTH_RIM_RADIUS)

    def test_cup_surface_contrast_and_simplification(self):
        # Material guard, not a claim about lit/rendered pixels: at least 1.25:1
        # for the broad food surface against ceramic. Highlight details excluded.
        for food in m.INGREDIENTS:
            state = m.PORTIONS[food][0][0]
            calls = self.capture(lambda: m.portion(food, state))
            surfaces = [args[2] if kind in ('ball','box') else args[1]
                        for kind,args,_ in calls if kind in ('ball','box','strand','ribbon')]
            self.assertTrue(surfaces, food)
            self.assertGreaterEqual(m.colour_contrast(surfaces[0],m.CERAMIC), 1.25, food)
        noodles = self.capture(lambda: m.ingredient('noodles','cooked',serving=True))
        self.assertEqual(len(noodles), 3)
        self.assertTrue(all(args[2]*2*120*.72*.36 >= 1.9 for _,args,_ in noodles))
        for drink in ('kopi','teh'):
            calls = self.capture(lambda: m.portion(drink,'cooked'))
            self.assertEqual([kind for kind,_,_ in calls], ['ball','strand'])
        self.assertGreater(m.colour_contrast('#462D20','#AD7445'), 2)


class SheetTests(unittest.TestCase):
    def test_composition_uses_scale_anchor_and_painter_order(self):
        blank = [(0,0,0,0)]*89**2
        food = list(blank)
        food[44*89+44] = (100,40,10,255)
        frames = {'base': {'anchors': {'food':[45.5,46.5]}}}
        result = item_sheet.compose(frames, {'base':blank,'food':food}, 'base',
                                    [{'frame':'food','slot':'food','scale':1,'order':10}])
        self.assertEqual(result[46*89+45], (100,40,10,255))
        self.assertEqual(sum(p[3] > 0 for p in result), 1)

    def test_sheet_preserves_native_and_exact_fourfold_pixels(self):
        pixels = [(255,0,255,255)]*89**2
        for zoom in (1,4):
            for name in item_sheet.BACKGROUNDS:
                _, page = next(item_sheet.pages([('test',pixels)], name, zoom))
                self.assertEqual(page.size, (1920,1080))
                mask = Image.new('1', page.size)
                mask.putdata([p[:3] == (255,0,255) for p in page.getdata()])
                bbox = mask.getbbox()
                self.assertEqual((bbox[2]-bbox[0],bbox[3]-bbox[1]), (89*zoom,89*zoom))

    def test_icon_page_retains_55_pixel_canvas(self):
        pixels = [(255,0,255,255)]*55**2
        for zoom in (1,4):
            _, page = next(item_sheet.pages([('icon-test',pixels)], 'light', zoom))
            mask = Image.new('1', page.size)
            mask.putdata([p[:3] == (255,0,255) for p in page.getdata()])
            x,y,right,bottom = mask.getbbox()
            self.assertEqual((right-x,bottom-y), (55*zoom,55*zoom))

    def test_every_dish_portion_container_and_served_variant_is_included(self):
        config = json.loads((item_sheet.ROOT/'assets/src/pipeline.json').read_text())
        frames = {f['id']:f for group in config['sets'] if group['id'] == 'tabao-rush-items'
                  for f in group['frames']}
        pixels = {ident:[(0,0,0,0)]*89**2 for ident in frames}
        cases = dict(item_sheet.review_cases(frames,pixels))
        for ident, frame in frames.items():
            if ident.startswith(('dish-','portion-','container-')):
                self.assertIn(ident,cases)
            for drink in frame.get('servedComposition',{}).get('variants',{}):
                self.assertIn(ident+' / '+drink,cases)
            if any(ident.startswith('portion-'+food+'-') for food in m.INGREDIENTS):
                for kind in ('plate','bowl','cup'):
                    self.assertIn(kind+' / '+ident,cases)
        self.assertIn('plate / portion-laksa-broth-cooked',cases)
        self.assertIn('cup / portion-bread-spread',cases)

    def test_stale_renders_refused_before_creating_evidence(self):
        with patch('sys.argv',['item_sheet.py','test-stale']), \
                patch.object(item_sheet.pipeline,'stale_reason',return_value='content stamp differs'), \
                patch.object(item_sheet.Path,'mkdir') as mkdir, \
                patch('sys.stderr'):
            with self.assertRaises(SystemExit) as error:
                item_sheet.main()
            self.assertEqual(error.exception.code,2)
            mkdir.assert_not_called()
