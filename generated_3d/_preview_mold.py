import bpy, math
from mathutils import Vector

out = r'c:\Users\timmy\Desktop\Projects\Bio Defence\generated_3d\pathogen_mold_hunyuan_preview.png'
mesh_path = r'c:\Users\timmy\Desktop\Projects\Bio Defence\generated_3d\pathogen_mold_hunyuan.glb'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block_collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
    for block in list(block_collection):
        if block.users == 0:
            block_collection.remove(block)

scene = bpy.context.scene
if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys():
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
else:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
if hasattr(scene.view_settings, 'view_transform'):
    scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = -0.3

world = bpy.data.worlds.new('PreviewWorld')
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs[0].default_value = (0.01, 0.01, 0.02, 1.0)
    bg.inputs[1].default_value = 0.05

bpy.ops.import_scene.gltf(filepath=mesh_path)
objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not objs:
    raise RuntimeError('No mesh objects imported')

bpy.ops.object.select_all(action='DESELECT')
for obj in objs:
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
bpy.ops.object.join()
obj = bpy.context.active_object
obj.rotation_euler = (math.radians(18), 0, math.radians(22))

bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
min_corner = Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
max_corner = Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))
center = (min_corner + max_corner) / 2
size = max((max_corner - min_corner).x, (max_corner - min_corner).y, (max_corner - min_corner).z)

cam_data = bpy.data.cameras.new('Camera')
cam = bpy.data.objects.new('Camera', cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, -size * 2.6, size * 1.4)
direction = center - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

for name, loc, energy, color, angle_z in [
    ('Key', (size*1.2, -size*2.2, size*2.2), 1600, (1.0, 0.92, 0.90), 25),
    ('Rim', (-size*1.8, size*1.4, size*1.8), 1000, (0.72, 0.86, 1.0), -145),
    ('Fill', (0, -size*1.8, size*0.8), 320, (1.0, 1.0, 1.0), 0),
]:
    light_data = bpy.data.lights.new(name=name, type='AREA')
    light_data.energy = energy
    light_data.color = color
    light_data.shape = 'RECTANGLE'
    light_data.size = size * 3.0
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = loc
    light.rotation_euler = (math.radians(65), 0, math.radians(angle_z))

scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print(out)
