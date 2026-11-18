"""A-07 / TR-009, TR-010, TR-062: small matte toy effect sprites."""
import argparse
import json
from pathlib import Path
import sys
import tempfile
import shutil
import math

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kalib as K
import effect_geometry as E


def render_unlit(layers, size, origin):
    """Camera-plane flame meshes with unlit palette colours, no peach lighting wash."""
    toward_camera = Vector((0, -.5, math.sin(math.pi/3)))
    for index, (outline, alpha, colour) in enumerate(layers):
        vertices = []
        for x, y in outline:
            sx, sy = x+origin[0]-size/2, y+size/2-origin[1]
            vertices.append(Vector((sx/120, sy*math.sin(math.pi/3)/120, sy*.5/120))
                            + toward_camera*index*.0002)
        mesh = bpy.data.meshes.new(f'flame-{index}')
        mesh.from_pydata(vertices, [], [tuple(range(len(vertices)))])
        mesh.update()
        obj = bpy.data.objects.new(f'flame-{index}', mesh)
        bpy.context.collection.objects.link(obj)
        material = bpy.data.materials.new(f'flame-colour-{index}')
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        emission = nodes.new('ShaderNodeEmission')
        # Blender shader colours are scene-linear; preserve the authored sRGB palette.
        rgb = [int(colour[i:i+2], 16)/255 for i in (1, 3, 5)]
        emission.inputs['Color'].default_value = tuple(
            c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)+(1,)
        emission.inputs['Strength'].default_value = 1
        transparent = nodes.new('ShaderNodeBsdfTransparent')
        mix = nodes.new('ShaderNodeMixShader')
        mix.inputs[0].default_value = alpha
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(emission.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], output.inputs['Surface'])
        obj.data.materials.append(material)


def render(effect, frame, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    K.STYLE = 'matte'
    K.lights()
    size, _, _, origin = E.EFFECTS[effect]
    if effect == 'shadow':
        # Analytic sRGB bytes: no Monte Carlo lighting or denoising grain.
        image = bpy.data.images.new('soft-shadow', width=size, height=size, alpha=True)
        image.pixels = E.shadow_pixels(size)
        image.filepath_raw = str(output)
        image.file_format = 'PNG'
        image.save()
        bpy.data.images.remove(image)
        return
    if effect in ('fire', 'sparks'):
        render_unlit(E.fire_tongues(frame) if effect == 'fire' else E.spark_layers(frame), size, origin)
    for index, (x, y, rx, ry, alpha, colour) in enumerate(E.particles(effect, frame)):
        if alpha < 1e-8:
            continue
        # Put rounded toy lobes in the camera plane, at 120 px/tile.
        sx, sy = x+origin[0]-size/2, y+size/2-origin[1]
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12,
            location=(sx/120, sy*math.sin(math.pi/3)/120, sy*.5/120))
        obj = bpy.context.object
        obj.rotation_euler.x = math.pi/6
        obj.scale = (rx/120, ry/120, min(rx, ry)/240)
        material = K.mat(colour)
        # Independent material per particle; mix physical matte with transparent.
        material = material.copy()
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        surface = nodes.get('Principled BSDF')
        transparent = nodes.new('ShaderNodeBsdfTransparent')
        mix = nodes.new('ShaderNodeMixShader')
        mix.inputs[0].default_value = alpha
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(surface.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], nodes.get('Material Output').inputs['Surface'])
        obj.data.materials.append(material)
        # Stable small depth offsets prevent coincident shadow surfaces.
        obj.location += Vector((0, -.5, math.sin(math.pi/3)))*index*.0001
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    bpy.ops.object.camera_add(location=(0, -9, 9*math.sqrt(3)))
    camera = bpy.context.object
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = size/120
    scene = bpy.context.scene
    scene.camera = camera
    if effect in ('fire', 'sparks'):
        scene.view_settings.view_transform = 'Standard'
        scene.view_settings.look = 'None'
        scene.view_settings.exposure = 0
        scene.view_settings.gamma = 1
    scene.render.engine = 'CYCLES'
    scene.cycles.seed = 0
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.cycles.transparent_max_bounces = 32
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(output), check_existing=False)
    try:
        pixels = list(image.pixels)
        occupied = [i for i, alpha in enumerate(pixels[3::4]) if alpha > .01]
        if not occupied or any(i % size in (0, size-1) or i // size in (0, size-1) for i in occupied):
            raise RuntimeError(f'{effect}-{frame}: empty or clipped rendered effect')
    finally:
        bpy.data.images.remove(image)


def strip_render_metadata(path):
    """TR-010: remove volatile Blender text without recompressing effect pixels."""
    data = path.read_bytes()
    chunks = [data[:8]]
    offset = 8
    while offset < len(data):
        length = int.from_bytes(data[offset:offset+4], 'big')
        end = offset + length + 12
        kind = data[offset+4:offset+8]
        if kind not in (b'tEXt', b'zTXt', b'iTXt'):
            chunks.append(data[offset:end])
        offset = end
    path.write_bytes(b''.join(chunks))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--effect', choices=E.EFFECTS, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    root = Path(__file__).resolve().parents[2]/'assets/src'
    destination = root/args.out
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        stage = Path(temporary)
        for frame in range(E.EFFECTS[args.effect][1]):
            output = stage/f'{args.effect}-{frame}.png'
            render(args.effect, frame, output)
            strip_render_metadata(output)
        (stage/'frames.json').write_text(json.dumps(E.frame_specs(args.effect), indent=2)+'\n')
        destination.mkdir(exist_ok=True)
        for file in stage.iterdir():
            shutil.copy2(file, destination/file.name)


if __name__ == '__main__':
    main()
