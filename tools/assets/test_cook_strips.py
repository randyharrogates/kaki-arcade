"""TR-060 diagnostic sheet pixel contracts, no rendering."""
import math
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from PIL import Image
import cook_strips as s


class CookStripTests(unittest.TestCase):
    def test_ground_offsets(self):
        for frame in range(8):
            distance = frame*.72/8
            for direction,expected in [('s',(0,120*math.sqrt(3)/2*distance)),('e',(120*distance,0)),('ne',(120*math.sqrt(.5)*distance,-120*math.sqrt(.5)*math.sqrt(3)/2*distance))]:
                actual = s.ground_offset(direction,frame)
                for a,b in zip(actual,expected):
                    self.assertAlmostEqual(a,b,places=12)

    def test_head_anchor(self):
        body = Image.new('RGBA',(256,256))
        head = Image.new('RGBA',(256,256))
        head.putpixel((10,20),(20,50,80,255))
        combined = s.composite_head(body,head,(90,100),(10,20))
        self.assertEqual(combined.getpixel((90,100)),(20,50,80,255))
        self.assertEqual(combined.getpixel((10,20)),(0,0,0,0))

    def test_tint_coverage(self):
        mask = Image.new('RGBA',(256,256))
        mask.putpixel((15,25),(255,255,255,128))
        tinted = s.tinted(mask,'#D9483B')
        self.assertEqual(tinted.getpixel((15,25)),(217,72,59,128))
        self.assertEqual(tinted.getchannel('A').tobytes(),mask.getchannel('A').tobytes())

    def test_motion_metrics(self):
        first = Image.new('RGBA',(25,20))
        second = first.copy()
        second.paste((25,0,0,0),(0,0,20,20))
        self.assertEqual(s.motion_metrics([first,second],[(0,0),(5,12)]),
                         dict(travelPx=13.,maxChangedPixels=400))
        second.paste((24,24,24,24),(0,0,25,20))
        self.assertEqual(s.motion_metrics([first,second],[(0,0),(0,0)])['maxChangedPixels'],0)
        second.paste((0,0,0,25),(0,0,25,20))
        self.assertEqual(s.motion_metrics([first,second],[(0,0),(0,0)])['maxChangedPixels'],500)

    def test_motion_thresholds_and_missing(self):
        report = {a:{d:dict(travelPx=13,maxChangedPixels=400, foot_l=15, foot_r=15, hand_l=8, hand_r=8, headSidewaysPx=8, oppositeChangedPixels=600) for d in s.C.DIRECTIONS}
                  for a in s.MOTION_THRESHOLDS}
        self.assertEqual(s.motion_failures(report),[])
        report['wash']['e']['travelPx'] = 12.99
        report['stir']['n']['maxChangedPixels'] = 399
        del report['chop']['s']
        self.assertEqual(len(s.motion_failures(report)),3)

    def test_multiplied(self):
        sprite = Image.new('RGBA', (3,1), (200,100,50,137))
        mask = Image.new('RGBA', (3,1), (255,255,255,0))
        mask.putpixel((1,0), (255,255,255,255))
        mask.putpixel((2,0), (255,255,255,128))
        result = s.multiplied(sprite, mask, (128,255,0))
        self.assertEqual(list(result.getdata()),
                         [(200,100,50,137),(100,100,0,137),(150,100,25,137)])

    def test_contact_sheet_format_and_ground_bounds(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            s.save_variants(Image.new('RGBA',(17,19)),out,'masks-only')
            self.assertEqual(len(list(out.glob('*.jpg'))),2)
            for path in out.glob('*.jpg'):
                with Image.open(path) as sheet:
                    self.assertEqual(sheet.size,(17,19))
            s.save_variants(Image.new('RGBA',(17,19)),out,'masks-only','png')
            self.assertEqual(len(list(out.glob('*.png'))),2)
            self.assertFalse(list(out.glob('*2x*')))
        cw,ch = s.ground_cell_size()
        for d in s.C.DIRECTIONS:
            for f in range(8):
                dx,dy = s.ground_offset(d,f)
                for delta,extent in ((dx,cw),(dy,ch)):
                    origin = (extent-s.SIZE)//2+round(delta)
                    self.assertGreaterEqual(origin,0)
                    self.assertLessEqual(origin+s.SIZE,extent)

    def test_all_actions_measure_tinted_composition(self):
        frames = {}
        for action,spec in s.C.ACTIONS.items():
            for d in s.C.DIRECTIONS:
                for f in range(spec['count']):
                    frames[f'{action}-{d}-{f}-mask'] = {}
                    frames[f'{action}-{d}-{f}'] = dict(anchors={
                        key:(f*5,0) for key in ('hands','throwHand','head','nozzle','foot_l','foot_r','hand_l','hand_r')})
                for suffix in ('','-mask'):
                    frames['head-cap-'+d+suffix] = {}
        with patch.object(s,'render_cell',return_value=Image.new('RGBA',(1,1))) as render:
            report = s.motion_report(Path('.'),frames)
        self.assertEqual(set(report),set(s.C.ACTIONS))
        self.assertTrue(all(call.args[3] == 'composed' for call in render.call_args_list))
        self.assertEqual(render.call_count,8*(56-8))  # release-only one-shots
        del frames['head-cap-n-mask']
        with patch.object(s,'render_cell',return_value=Image.new('RGBA',(1,1))):
            report = s.motion_report(Path('.'),frames)
        self.assertTrue(all('n' not in directions for directions in report.values()))

    def test_missing_walk_landmark_is_explicit_failure(self):
        frames = {}
        for f in range(8):
            ident = f'walk-s-{f}'
            frames[ident] = dict(anchors=dict.fromkeys(
                ('hands', 'head', 'foot_l', 'foot_r', 'hand_l', 'hand_r'), (f*3, 0)))
            frames[ident+'-mask'] = {}
        frames['head-cap-s'] = frames['head-cap-s-mask'] = {}
        del frames['walk-s-3']['anchors']['hand_r']
        with patch.object(s, 'render_cell', return_value=Image.new('RGBA', (1,1))):
            report = s.motion_report(Path('.'), frames)
        self.assertEqual(report['walk']['s']['missingLandmarks'], ['hand_r'])
        self.assertTrue(any('walk/s: walk gate' in failure and 'missingLandmarks' in failure
                            for failure in s.motion_failures(report)))

    def test_one_shots_measure_composition_at_release(self):
        frames = {}
        for action in ('serve','throw'):
            for d in s.C.DIRECTIONS:
                for f in range(6):
                    frames[f'{action}-{d}-{f}-mask'] = {}
                    frames[f'{action}-{d}-{f}'] = dict(anchors={'hands':(f*5,0),'throwHand':(f*5,0),'head':(0,0)})
                for suffix in ('','-mask'):
                    frames['head-cap-'+d+suffix] = {}
        calls = []
        def composed(source, records, ident, mode):
            calls.append((ident,mode))
            return Image.new('RGBA',(25,20),(255 if ident.endswith('-3') else 0,0,0,255))
        with patch.object(s,'render_cell',side_effect=composed):
            report = s.motion_report(Path('.'),frames)
        self.assertEqual(len(calls),32)
        self.assertTrue(all(mode == 'composed' and ident[-1] in ('0','3') for ident,mode in calls))
        self.assertEqual(report['throw']['n']['anchor'],'throwHand')
        self.assertEqual(report['serve']['n']['maxChangedPixels'],500)
        self.assertEqual(report['throw']['n']['travelPx'],15)
        del frames['head-cap-n']
        with patch.object(s,'render_cell',side_effect=composed):
            self.assertNotIn('n',s.motion_report(Path('.'),frames)['throw'])


class WalkGateTests(unittest.TestCase):
    def test_static_and_small_gait_fail(self):
        report = {a: {d: dict(travelPx=20, maxChangedPixels=400,
            foot_l=15, foot_r=15, hand_l=8, hand_r=8, headSidewaysPx=8,
            oppositeChangedPixels=600) for d in s.C.DIRECTIONS}
            for a in s.MOTION_THRESHOLDS}
        self.assertEqual(s.motion_failures(report), [])
        for key in ('foot_l', 'foot_r', 'hand_l', 'hand_r', 'headSidewaysPx', 'oppositeChangedPixels'):
            with self.subTest(key=key):
                old = report['walk']['s'][key]
                report['walk']['s'][key] = old-.01
                self.assertTrue(s.motion_failures(report))
                report['walk']['s'][key] = old
        cells = [Image.new('RGBA', (20,20)) for _ in range(8)]
        anchors = [dict.fromkeys(('foot_l','foot_r','hand_l','hand_r','head'), (0,0))]*8
        static = s.walk_metrics(cells, anchors)
        self.assertTrue(all(value == 0 for value in static.values()))
        report['carry-walk']['n'].update(static)
        self.assertTrue(s.motion_failures(report))

    def test_opposite_phase_pixels_and_individual_landmarks(self):
        cells = [Image.new('RGBA', (20,20), (0,0,0,255)) for _ in range(8)]
        for cell in cells[4:]:
            cell.paste((255,0,0,255), (0,0,15,20))
        anchors = [dict.fromkeys(('foot_l','foot_r','hand_l','hand_r','head'),
                                (f*3,0)) for f in range(8)]
        metric = s.walk_metrics(cells, anchors)
        self.assertEqual(metric['oppositeChangedPixels'], 300)
        self.assertEqual(metric['foot_l'], 21)
        self.assertEqual(metric['headSidewaysPx'], 21)
        cells[6] = cells[2].copy()
        self.assertEqual(s.walk_metrics(cells, anchors)['oppositeChangedPixels'], 0)
