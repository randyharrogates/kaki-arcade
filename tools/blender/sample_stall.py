"""First-pass sample scene from the art finish comparison (docs/design-gate/00). Simple solids,
Cycles. A reference for scripting Blender headlessly, NOT the art style (that is chosen at
design gate board 1).

Run: blender -b --factory-startup -P tools/blender/sample_stall.py -- /abs/out.png
Optional env: SAMPLES (default 96), RES (resolution multiplier, default 1).
"""
import bpy, bmesh, math, sys
from mathutils import Vector
out = sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, col, rough=0.5, metal=0.0, emit=None, es=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = es
    return m

def finish(o, m, bevel=0.0, smooth=True):
    o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 4
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def box(name, loc, size, m, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object; o.name = name
    o.scale = (size[0]/2, size[1]/2, size[2]/2)
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, bevel, smooth=False)

def cyl(name, loc, r, h, m, bevel=0.02, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o = finish(o, m, bevel)
    md = o.modifiers.new("ws", "WEIGHTED_NORMAL")
    return o

def ball(name, loc, r, m, scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale
    return finish(o, m)

# materials
steel = mat("steel", (0.62,0.66,0.70), 0.28, 1.0)
steel_d = mat("steel_d", (0.30,0.32,0.35), 0.45, 1.0)
iron = mat("iron", (0.05,0.05,0.055), 0.55, 0.8)
wokm = mat("wok", (0.16,0.17,0.19), 0.32, 1.0)
wood = mat("wood", (0.62,0.40,0.18), 0.6)
wood_d = mat("wood_d", (0.22,0.13,0.07), 0.6)
green = mat("green", (0.16,0.42,0.12), 0.45)
lgreen = mat("lgreen", (0.62,0.80,0.40), 0.5)
white = mat("white", (0.80,0.82,0.84), 0.3)
rice = mat("rice", (0.88,0.78,0.48), 0.8)
chick = mat("chick", (0.90,0.72,0.45), 0.55)
red = mat("red", (0.78,0.16,0.07), 0.6)
skin = mat("skin", (0.86,0.60,0.42), 0.6)
cloth = mat("cloth", (0.95,0.93,0.86), 0.8)
orange = mat("orange", (0.90,0.50,0.08), 0.5)
flame = mat("flame", (1,0.45,0.05), 0.5, 0, (1.0,0.42,0.05), 14)

# floor with checker tiles
bpy.ops.mesh.primitive_plane_add(size=16, location=(0,0,0)); fl = bpy.context.object
fm = bpy.data.materials.new("floor"); fm.use_nodes = True
nt = fm.node_tree; b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.55
ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 16
ck.inputs["Color1"].default_value = (0.86,0.76,0.52,1); ck.inputs["Color2"].default_value = (0.74,0.62,0.38,1)
nt.links.new(ck.outputs["Color"], b.inputs["Base Color"]); fl.data.materials.append(fm)

# counter
box("counter", (0,2.3,0.45), (8.4,1.5,0.9), steel_d, 0.04)
box("top", (0,2.3,0.93), (8.5,1.6,0.06), steel, 0.02)

# burner + wok
bx, by, cz = -2.3, 2.3, 0.96
cyl("burner", (bx,by,cz+0.05), 0.62, 0.10, iron)
bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.05, location=(bx,by,cz+0.12)); t = bpy.context.object; finish(t, flame)
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.6, location=(bx,by,cz+0.52)); w = bpy.context.object
bm = bmesh.new(); bm.from_mesh(w.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 0.02], context='VERTS'); bm.to_mesh(w.data); bm.free()
w.scale = (1,1,0.62); sm = w.modifiers.new("s","SOLIDIFY"); sm.thickness = 0.04; finish(w, wokm)
cyl("handle", (bx+0.95,by,cz+0.50), 0.055, 0.75, wood_d, 0.01, rot=(0,math.radians(90),0))
for i,(dx,dy,m) in enumerate([(-0.12,0.05,orange),(0.14,-0.08,green),(0.10,0.16,red),(-0.10,-0.16,rice),(0.0,0.0,lgreen)]):
    ball(f"veg{i}", (bx+dx,by+dy,cz+0.26), 0.11, m, (1,1,0.7))

# chopping board
box("board", (0,2.3,cz+0.04), (1.7,1.1,0.08), wood, 0.03)
ball("cucumber", (-0.35,2.35,cz+0.20), 0.13, green, (3.0,1,1))
for i,(dx,dy) in enumerate([(0.30,0.20),(0.52,-0.05),(0.36,-0.25)]):
    cyl(f"slice{i}", (dx,2.3+dy,cz+0.10), 0.14, 0.035, lgreen, 0.008)
kn = box("knife", (0.15,1.95,cz+0.095), (0.9,0.10,0.015), steel, 0.004); kn.rotation_euler = (0,0,math.radians(-10))

# plate of chicken rice
px = 2.4
cyl("plate", (px,2.3,cz+0.025), 0.62, 0.05, white, 0.02)
cyl("well", (px,2.3,cz+0.052), 0.45, 0.01, white, 0.004)
ball("rice", (px-0.12,2.26,cz+0.06), 0.30, rice, (1,1,0.55))
for i in range(3):
    c = box(f"chick{i}", (px+0.20,2.46-0.16*i,cz+0.11), (0.44,0.13,0.09), chick, 0.03)
ball("garnish", (px-0.32,2.60,cz+0.10), 0.09, green, (1,1,0.6)); ball("chilli", (px-0.36,1.98,cz+0.10), 0.08, red, (1,1,0.6))

# cook
cx, cy = 0.0, -0.3
ball("body", (cx,cy,0.55), 0.62, red, (1.1,0.85,0.9))
box("apron", (cx,cy-0.45,0.55), (0.55,0.12,0.6), cloth, 0.05)
ball("head", (cx,cy,1.35), 0.40, skin)
cyl("hatband", (cx,cy,1.74), 0.24, 0.14, cloth, 0.02)
ball("hat", (cx,cy,1.88), 0.27, cloth, (1,1,0.7))
ball("handL", (cx-0.80,cy+0.25,0.75), 0.16, skin); ball("handR", (cx+0.80,cy+0.25,0.75), 0.16, skin)

# lights
bpy.ops.object.light_add(type='SUN', location=(4,-4,8)); s = bpy.context.object; s.data.energy = 3.6; s.data.color = (1,0.95,0.86); s.data.angle = math.radians(12)
s.rotation_euler = (math.radians(42),0,math.radians(28))
bpy.ops.object.light_add(type='AREA', location=(-4,-3,6)); a = bpy.context.object; a.data.energy = 220; a.data.size = 6; a.data.color = (0.85,0.92,1)
a.rotation_euler = (math.radians(40),0,math.radians(-50))
bpy.ops.object.light_add(type='POINT', location=(bx,by-0.2,cz+0.9)); p = bpy.context.object; p.data.energy = 60; p.data.color = (1,0.55,0.2)
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes["Background"].inputs[0].default_value = (0.75,0.80,0.90,1); wd.node_tree.nodes["Background"].inputs[1].default_value = 0.28

# camera: orthographic, tilted three-quarter top view
bpy.ops.object.camera_add(location=(0,-7.2,10)); cam = bpy.context.object; sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 6.7
d = Vector((0,1.0,0.5)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z','Y').to_euler()

sc.render.engine = 'CYCLES'
try:
    pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
    for dv in pr.devices: dv.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print("GPU setup skipped:", e)
import os
sc.cycles.samples = int(os.environ.get('SAMPLES','96')); sc.cycles.use_denoising = True
R=float(os.environ.get('RES','1')); sc.render.resolution_x = int(960*R); sc.render.resolution_y = int(720*R)
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception as e: print('look skipped', e)
sc.render.filepath = out; sc.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
