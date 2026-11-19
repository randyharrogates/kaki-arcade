"""TR-001: render eleven unlit, transparent recipe-step glyphs for HUD cards."""
import json
from pathlib import Path
import sys
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kalib as K
import step_icon_geometry as G


def main():
    out = Path(__file__).resolve().parents[2]/'assets/src'/G.FOLDER
    out.mkdir(parents=True, exist_ok=True)
    for kind in G.KINDS:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = 32
        scene.render.resolution_x = scene.render.resolution_y = G.SIZE
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.view_settings.view_transform = 'Standard'
        scene.view_settings.look = 'None'
        scene.view_settings.exposure = 0
        scene.view_settings.gamma = 1
        material = bpy.data.materials.new('print-red-brown')
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        nodes.clear()
        emission = nodes.new('ShaderNodeEmission')
        emission.inputs['Color'].default_value = (*K.srgb_hexc(G.COLOUR),1)
        emission.inputs['Strength'].default_value = 1
        output = nodes.new('ShaderNodeOutputMaterial')
        links.new(emission.outputs[0],output.inputs['Surface'])
        for i,polygon in enumerate(G.geometry(kind)):
            mesh = bpy.data.meshes.new(f'{kind}-{i}')
            # Camera looks down -Z; authored +y is screen-down.
            mesh.from_pydata([(x-17,17-y,0) for x,y in polygon], [],
                             [tuple(reversed(range(len(polygon))))])
            mesh.update()
            obj = bpy.data.objects.new(mesh.name,mesh)
            scene.collection.objects.link(obj)
            obj.data.materials.append(material)
        bpy.ops.object.camera_add(location=(0,0,100))
        camera = bpy.context.object
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = G.SIZE
        scene.camera = camera
        scene.render.filepath = str(out/f'{kind}.png')
        bpy.ops.render.render(write_still=True)
        # Use Blender only for coverage. PNG bytes fix RGB exactly, including
        # transparent/antialiased pixels, while retaining the rendered alpha.
        rendered = bpy.data.images.load(scene.render.filepath, check_existing=False)
        pixels = list(rendered.pixels)
        alpha = [round(pixels[(y*G.SIZE+x)*4+3]*255)
                 for y in reversed(range(G.SIZE)) for x in range(G.SIZE)]
        Path(scene.render.filepath).write_bytes(G.ink_png(G.SIZE,G.SIZE,alpha))
        bpy.data.images.remove(rendered)
    (out/'frames.json').write_text(json.dumps(
        [G.specification(k) for k in G.KINDS],indent=2)+'\n')


if __name__ == '__main__':
    main()
