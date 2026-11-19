"""TR-001: pure geometry checks; rendered recognition remains integrator work."""
import itertools
import struct
import zlib
import unittest
import step_icon_geometry as G


def aligned(mask, size):
    points = {(i % size, i // size) for i in mask}
    left = min(x for x,y in points)
    top = min(y for x,y in points)
    return {(x-left,y-top) for x,y in points}


class StepGeometryTests(unittest.TestCase):
    def test_eleven_bounded_original_glyphs(self):
        self.assertEqual(len(set(G.KINDS)),11)
        for kind in G.KINDS:
            with self.subTest(kind=kind):
                for polygon in G.geometry(kind):
                    self.assertGreaterEqual(len(polygon),3)
                    self.assertTrue(all(3 <= x <= 31 and 3 <= y <= 31 for x,y in polygon))
                self.assertGreater(len(G.silhouette(kind)),70)
                self.assertEqual(G.specification(kind)['anchor'],[17,17])
                self.assertEqual(G.specification(kind)['anchors']['centre'],[17,17])
        with self.assertRaises(ValueError):
            G.geometry('unknown')

    def test_fixed_ink_png_preserves_alpha(self):
        alpha = [0,1,128,254,255,64]
        data = G.ink_png(3,2,alpha)
        self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')
        offset, compressed = 8, b''
        while offset < len(data):
            size = struct.unpack('>I',data[offset:offset+4])[0]
            kind = data[offset+4:offset+8]
            payload = data[offset+8:offset+8+size]
            self.assertEqual(struct.unpack('>I',data[offset+8+size:offset+12+size])[0],
                             zlib.crc32(kind+payload))
            if kind == b'IDAT':
                compressed += payload
            offset += size+12
        rows = zlib.decompress(compressed)
        self.assertEqual(rows,b'\0'+b''.join(bytes((142,42,24,a)) for a in alpha[:3])+
                         b'\0'+b''.join(bytes((142,42,24,a)) for a in alpha[3:]))

    def assert_distinct(self, a, b, size):
        self.assertGreaterEqual(len(aligned(a,size)^aligned(b,size))/size**2,
                                G.MIN_DIFFERENCE)

    def test_duplicate_and_shifted_duplicate_fail(self):
        for size in (34,17):
            mask = {y*size+x for y in range(4,10) for x in range(4,10)}
            for shift in (0,2):
                with self.subTest(size=size, shift=shift), self.assertRaises(AssertionError):
                    self.assert_distinct(mask,{i+shift for i in mask},size)

    def test_silhouettes(self):
        for a,b in itertools.combinations(G.KINDS,2):
            with self.subTest(pair=(a,b)):
                self.assert_distinct(G.silhouette(a),G.silhouette(b),G.SIZE)

    def test_half_grid_silhouettes(self):
        masks = {}
        for kind in G.KINDS:
            full = G.silhouette(kind)
            masks[kind] = {y*17+x for y in range(17) for x in range(17)
                           if sum((2*y+dy)*34+2*x+dx in full
                                  for dy in (0,1) for dx in (0,1)) >= 3}
        for a,b in itertools.combinations(G.KINDS,2):
            with self.subTest(pair=(a,b)):
                self.assert_distinct(masks[a],masks[b],17)
