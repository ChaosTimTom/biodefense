#!/usr/bin/env python3
"""
render_25d_assets.py

Automated Blender render pipeline for Bio Defence's 2.5D board pieces.
Produces transparent PNG renders for pathogens, medicines, and board tiles.

Usage:
  blender --background --factory-startup --python scripts/blender/render_25d_assets.py -- --output public/assets/rendered25d --size 320
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from typing import Iterable, List, Tuple

import bpy
from mathutils import Euler, Vector


PATHOGEN_COLORS = {
    "coccus": "#4CAF50",
    "bacillus": "#8BC34A",
    "spirillum": "#009688",
    "influenza": "#F44336",
    "retrovirus": "#C62828",
    "phage": "#FF5722",
    "mold": "#9C27B0",
    "yeast": "#CE93D8",
    "spore": "#4A148C",
}

MEDICINE_COLORS = {
    "penicillin": "#00E5FF",
    "tetracycline": "#18FFFF",
    "streptomycin": "#00BFA5",
    "tamiflu": "#76FF03",
    "zidovudine": "#B2FF59",
    "interferon": "#AEEA00",
    "fluconazole": "#EA80FC",
    "nystatin": "#E040FB",
    "amphotericin": "#D500F9",
}

WORLD_TILE_ACCENTS = {
    0: "#5EDFFF",
    1: "#79FFC9",
    2: "#FF6B7D",
    3: "#B78AFF",
    4: "#FF8D45",
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--size", type=int, default=320)
    parser.add_argument("--asset", default="all")
    return parser.parse_args(argv)


def hex_to_rgba(value: str, alpha: float = 1.0) -> Tuple[float, float, float, float]:
    value = value.lstrip("#")
    return (
        int(value[0:2], 16) / 255.0,
        int(value[2:4], 16) / 255.0,
        int(value[4:6], 16) / 255.0,
        alpha,
    )


def darken(color: str, factor: float) -> Tuple[float, float, float, float]:
    r, g, b, _ = hex_to_rgba(color, 1.0)
    return (r * factor, g * factor, b * factor, 1.0)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def look_at(obj: bpy.types.Object, target: Tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_camera(
    name: str,
    location: Tuple[float, float, float],
    target: Tuple[float, float, float],
    lens: float,
    *,
    orthographic_scale: float | None = None,
) -> bpy.types.Object:
    camera_data = bpy.data.cameras.new(name)
    if orthographic_scale is not None:
        camera_data.type = "ORTHO"
        camera_data.ortho_scale = orthographic_scale
    else:
        camera_data.lens = lens
    camera = bpy.data.objects.new(name, camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = location
    look_at(camera, target)
    return camera


def add_area_light(
    name: str,
    location: Tuple[float, float, float],
    rotation: Tuple[float, float, float],
    energy: float,
    color: str = "#FFFFFF",
    size: float = 6.0,
) -> bpy.types.Object:
    light_data = bpy.data.lights.new(name=name, type="AREA")
    light_data.energy = energy
    light_data.color = hex_to_rgba(color)[:3]
    light_data.shape = "RECTANGLE"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = location
    light.rotation_euler = rotation
    return light


def setup_scene(size: int) -> Tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    if "BLENDER_EEVEE_NEXT" in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys():
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    else:
        scene.render.engine = "BLENDER_EEVEE"

    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    if hasattr(scene.view_settings, "view_transform"):
        scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = -0.45
    scene.view_settings.gamma = 1.0

    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 48
        if hasattr(scene.eevee, "use_bloom"):
            scene.eevee.use_bloom = True
        if hasattr(scene.eevee, "bloom_intensity"):
            scene.eevee.bloom_intensity = 0.04

    world = bpy.data.worlds.new("BioDefenceWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.005, 0.012, 0.022, 1.0)
        bg.inputs[1].default_value = 0.05

    piece_camera = create_camera(
        "PieceCamera",
        (0.0, -5.25, 2.55),
        (0.0, 0.0, 0.58),
        78.0,
    )
    tile_camera = create_camera(
        "TileCamera",
        (0.0, 0.0, 6.0),
        (0.0, 0.0, 0.0),
        72.0,
        orthographic_scale=2.55,
    )
    wall_camera = create_camera(
        "WallCamera",
        (0.0, -5.9, 4.5),
        (0.0, 0.0, 0.1),
        50.0,
    )

    add_area_light("KeyLight", (2.4, -4.4, 4.2), (math.radians(64), 0, math.radians(24)), 820, "#FBE8DE", 5.5)
    add_area_light("RimLight", (-2.8, 2.4, 3.4), (math.radians(62), 0, math.radians(-142)), 560, "#64F5FF", 5.0)
    add_area_light("TopLight", (0.0, -1.5, 6.0), (math.radians(90), 0, 0), 180, "#FFFFFF", 6.5)
    add_area_light("FillLight", (0.0, -5.4, 1.4), (math.radians(85), 0, 0), 85, "#DCEEFF", 10.0)

    return piece_camera, tile_camera, wall_camera


def set_input(node: bpy.types.Node, names: Iterable[str], value) -> None:
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def create_material(
    name: str,
    base_hex: str,
    *,
    accent_hex: str | None = None,
    metallic: float = 0.15,
    roughness: float = 0.28,
    transmission: float = 0.0,
    emission_strength: float = 1.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (360, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (80, 0)
    set_input(bsdf, ["Base Color"], hex_to_rgba(base_hex))
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["Metallic"], metallic)
    set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.34)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.08)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.12)
    set_input(bsdf, ["Emission Color", "Emission"], hex_to_rgba(accent_hex or base_hex))
    set_input(bsdf, ["Emission Strength"], emission_strength * 0.06)

    nt.links.new(bsdf.outputs[0], output.inputs[0])

    return material


def set_material_alpha(material: bpy.types.Material, alpha: float) -> None:
    material.blend_method = "BLEND"
    if hasattr(material, "shadow_method"):
        material.shadow_method = "NONE"
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        set_input(bsdf, ["Alpha"], alpha)


def rotated_axis(rotation: Tuple[float, float, float], axis: Tuple[float, float, float] = (0.0, 0.0, 1.0)) -> Vector:
    vector = Vector(axis)
    vector.rotate(Euler(rotation, "XYZ"))
    return vector.normalized()


def create_emissive_material(name: str, color_hex: str, strength: float = 3.2) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (220, 0)

    emission = nt.nodes.new("ShaderNodeEmission")
    emission.location = (0, 0)
    emission.inputs["Color"].default_value = hex_to_rgba(color_hex)
    emission.inputs["Strength"].default_value = strength

    nt.links.new(emission.outputs[0], output.inputs[0])
    return material


def create_image_box_material(
    name: str,
    image_path: str,
    *,
    base_hex: str = "#161C22",
    metallic: float = 0.25,
    roughness: float = 0.34,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (620, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (360, 0)
    set_input(bsdf, ["Base Color"], hex_to_rgba(base_hex))
    set_input(bsdf, ["Metallic"], metallic)
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.38)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.08)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.12)

    image = nt.nodes.new("ShaderNodeTexImage")
    image.location = (-120, 0)
    image.image = bpy.data.images.load(image_path, check_existing=True)
    image.extension = "CLIP"

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-360, 0)

    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.location = (120, 0)
    mix.inputs["Color1"].default_value = hex_to_rgba(base_hex)

    nt.links.new(tex_coord.outputs["UV"], image.inputs["Vector"])
    nt.links.new(image.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(image.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs[0], output.inputs[0])
    return material


def create_image_plane_material(
    name: str,
    image_path: str,
    *,
    emission_strength: float = 1.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    material.blend_method = "BLEND"
    if hasattr(material, "shadow_method"):
        material.shadow_method = "NONE"

    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (620, 0)

    transparent = nt.nodes.new("ShaderNodeBsdfTransparent")
    transparent.location = (260, -120)

    emission = nt.nodes.new("ShaderNodeEmission")
    emission.location = (260, 80)
    emission.inputs["Strength"].default_value = emission_strength

    image = nt.nodes.new("ShaderNodeTexImage")
    image.location = (-140, 0)
    image.image = bpy.data.images.load(image_path, check_existing=True)
    image.extension = "CLIP"

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-360, 0)

    mix_shader = nt.nodes.new("ShaderNodeMixShader")
    mix_shader.location = (470, 0)

    nt.links.new(tex_coord.outputs["UV"], image.inputs["Vector"])
    nt.links.new(image.outputs["Color"], emission.inputs["Color"])
    nt.links.new(image.outputs["Alpha"], mix_shader.inputs["Fac"])
    nt.links.new(transparent.outputs[0], mix_shader.inputs[1])
    nt.links.new(emission.outputs[0], mix_shader.inputs[2])
    nt.links.new(mix_shader.outputs[0], output.inputs[0])
    return material


def create_scratched_metal_material(
    name: str,
    base_hex: str,
    *,
    accent_hex: str | None = None,
    metallic: float = 0.7,
    roughness: float = 0.42,
    scratch_scale: float = 24.0,
    scratch_strength: float = 0.025,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (760, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (520, 0)
    set_input(bsdf, ["Base Color"], hex_to_rgba(base_hex))
    set_input(bsdf, ["Metallic"], metallic)
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.36)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.08)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.18)
    set_input(bsdf, ["Emission Color", "Emission"], hex_to_rgba(accent_hex or base_hex))
    set_input(bsdf, ["Emission Strength"], emission_strength)

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-940, 40)

    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-740, 40)
    mapping.inputs["Scale"].default_value = (scratch_scale, scratch_scale, scratch_scale)

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-520, 120)
    noise.inputs["Scale"].default_value = 9.0
    noise.inputs["Detail"].default_value = 12.0
    noise.inputs["Roughness"].default_value = 0.55

    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.location = (-520, -100)
    wave.wave_type = "BANDS"
    wave.bands_direction = "DIAGONAL"
    wave.inputs["Scale"].default_value = 6.8
    wave.inputs["Distortion"].default_value = 14.0
    wave.inputs["Detail"].default_value = 3.4
    wave.inputs["Detail Scale"].default_value = 3.2

    scratch_mix = nt.nodes.new("ShaderNodeMixRGB")
    scratch_mix.location = (-280, 0)
    scratch_mix.blend_type = "MULTIPLY"
    scratch_mix.inputs["Fac"].default_value = 0.55

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-60, 0)
    ramp.color_ramp.elements[0].position = 0.43
    ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    ramp.color_ramp.elements[1].position = 0.62
    ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (260, 0)
    bump.inputs["Strength"].default_value = scratch_strength
    bump.inputs["Distance"].default_value = 1.0

    nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(noise.outputs["Color"], scratch_mix.inputs[1])
    nt.links.new(wave.outputs["Color"], scratch_mix.inputs[2])
    nt.links.new(scratch_mix.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], output.inputs[0])

    return material


def create_organic_overlay_material(
    name: str,
    base_hex: str,
    image_path: str,
    *,
    accent_hex: str | None = None,
    metallic: float = 0.08,
    roughness: float = 0.20,
    transmission: float = 0.10,
    emission_strength: float = 0.45,
    overlay_factor: float = 0.34,
    mapping_scale: Tuple[float, float, float] = (1.2, 1.2, 1.2),
    bump_strength: float = 0.08,
    contrast: float = 1.0,
    brightness: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (780, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (520, 0)
    set_input(bsdf, ["Base Color"], hex_to_rgba(base_hex))
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["Metallic"], metallic)
    set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.36)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.10)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.10)
    set_input(bsdf, ["Emission Color", "Emission"], hex_to_rgba(accent_hex or base_hex))
    set_input(bsdf, ["Emission Strength"], emission_strength * 0.06)

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-840, 20)

    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-620, 20)
    mapping.inputs["Scale"].default_value = mapping_scale

    image = nt.nodes.new("ShaderNodeTexImage")
    image.location = (-380, 20)
    image.image = bpy.data.images.load(image_path, check_existing=True)
    image.extension = "REPEAT"
    image.interpolation = "Cubic"

    bright_contrast = nt.nodes.new("ShaderNodeBrightContrast")
    bright_contrast.location = (-240, 20)
    bright_contrast.inputs["Bright"].default_value = brightness
    bright_contrast.inputs["Contrast"].default_value = contrast

    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.location = (-30, 20)
    mix.blend_type = "OVERLAY"
    mix.inputs["Fac"].default_value = overlay_factor
    mix.inputs["Color1"].default_value = hex_to_rgba(base_hex)

    rgb_to_bw = nt.nodes.new("ShaderNodeRGBToBW")
    rgb_to_bw.location = (-30, -170)

    bump_ramp = nt.nodes.new("ShaderNodeValToRGB")
    bump_ramp.location = (120, -170)
    bump_ramp.color_ramp.elements[0].position = 0.36
    bump_ramp.color_ramp.elements[1].position = 0.76

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (300, -150)
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.35

    nt.links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], image.inputs["Vector"])
    nt.links.new(image.outputs["Color"], bright_contrast.inputs["Color"])
    nt.links.new(bright_contrast.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bright_contrast.outputs["Color"], rgb_to_bw.inputs["Color"])
    nt.links.new(rgb_to_bw.outputs["Val"], bump_ramp.inputs["Fac"])
    nt.links.new(bump_ramp.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], output.inputs[0])

    return material


def create_proofed_dough_material(
    name: str,
    base_hex: str,
    *,
    crumb_hex: str = "#F4E4D8",
    blush_hex: str = "#EAB7DA",
    roughness: float = 0.58,
    bump_strength: float = 0.075,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nt = material.node_tree
    nt.nodes.clear()

    output = nt.nodes.new("ShaderNodeOutputMaterial")
    output.location = (980, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (740, 0)
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["Metallic"], 0.0)
    set_input(bsdf, ["Transmission Weight", "Transmission"], 0.0)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.24)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.02)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.45)
    set_input(bsdf, ["Sheen Weight", "Sheen"], 0.16)
    set_input(bsdf, ["Emission Color", "Emission"], hex_to_rgba("#D59BE0"))
    set_input(bsdf, ["Emission Strength"], 0.018)

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-1080, 50)

    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-860, 50)
    mapping.inputs["Scale"].default_value = (3.2, 3.2, 3.2)

    broad_noise = nt.nodes.new("ShaderNodeTexNoise")
    broad_noise.location = (-620, 180)
    broad_noise.inputs["Scale"].default_value = 3.0
    broad_noise.inputs["Detail"].default_value = 7.0
    broad_noise.inputs["Roughness"].default_value = 0.48

    fine_noise = nt.nodes.new("ShaderNodeTexNoise")
    fine_noise.location = (-620, -40)
    fine_noise.inputs["Scale"].default_value = 10.0
    fine_noise.inputs["Detail"].default_value = 11.0
    fine_noise.inputs["Roughness"].default_value = 0.56

    pore_noise = nt.nodes.new("ShaderNodeTexVoronoi")
    pore_noise.location = (-620, -300)
    pore_noise.feature = "SMOOTH_F1"
    pore_noise.distance = "EUCLIDEAN"
    pore_noise.inputs["Scale"].default_value = 7.6
    if "Randomness" in pore_noise.inputs:
        pore_noise.inputs["Randomness"].default_value = 0.78

    broad_ramp = nt.nodes.new("ShaderNodeValToRGB")
    broad_ramp.location = (-400, 180)
    broad_ramp.color_ramp.elements[0].position = 0.26
    broad_ramp.color_ramp.elements[0].color = hex_to_rgba(crumb_hex)
    broad_ramp.color_ramp.elements[1].position = 0.76
    broad_ramp.color_ramp.elements[1].color = hex_to_rgba(base_hex)

    blush_mix = nt.nodes.new("ShaderNodeMixRGB")
    blush_mix.location = (-180, 110)
    blush_mix.blend_type = "MIX"
    blush_mix.inputs["Color2"].default_value = hex_to_rgba(blush_hex)
    blush_mix.inputs["Fac"].default_value = 0.16

    pore_ramp = nt.nodes.new("ShaderNodeValToRGB")
    pore_ramp.location = (-360, -290)
    pore_ramp.color_ramp.elements[0].position = 0.22
    pore_ramp.color_ramp.elements[1].position = 0.68

    pore_mix = nt.nodes.new("ShaderNodeMixRGB")
    pore_mix.location = (40, 30)
    pore_mix.blend_type = "MULTIPLY"
    pore_mix.inputs["Fac"].default_value = 0.18

    bump_mix = nt.nodes.new("ShaderNodeMixRGB")
    bump_mix.location = (40, -210)
    bump_mix.blend_type = "ADD"
    bump_mix.inputs["Fac"].default_value = 0.55

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (300, -170)
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.32

    nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], broad_noise.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], fine_noise.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], pore_noise.inputs["Vector"])
    nt.links.new(broad_noise.outputs["Fac"], broad_ramp.inputs["Fac"])
    nt.links.new(fine_noise.outputs["Color"], blush_mix.inputs["Color1"])
    nt.links.new(broad_ramp.outputs["Color"], blush_mix.inputs["Color2"])
    nt.links.new(pore_noise.outputs["Distance"], pore_ramp.inputs["Fac"])
    nt.links.new(blush_mix.outputs["Color"], pore_mix.inputs["Color1"])
    nt.links.new(pore_ramp.outputs["Color"], pore_mix.inputs["Color2"])
    nt.links.new(fine_noise.outputs["Color"], bump_mix.inputs["Color1"])
    nt.links.new(pore_ramp.outputs["Color"], bump_mix.inputs["Color2"])
    nt.links.new(pore_mix.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bump_mix.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], output.inputs[0])

    return material


def normalize_objects(
    objects: Iterable[bpy.types.Object],
    *,
    target_span: float,
    base_z: float = 0.0,
) -> None:
    objects = list(objects)
    if not objects:
        return

    bpy.context.view_layer.update()

    min_x = min_y = min_z = float("inf")
    max_x = max_y = max_z = float("-inf")
    for obj in objects:
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            min_x = min(min_x, world_corner.x)
            min_y = min(min_y, world_corner.y)
            min_z = min(min_z, world_corner.z)
            max_x = max(max_x, world_corner.x)
            max_y = max(max_y, world_corner.y)
            max_z = max(max_z, world_corner.z)

    span = max(max_x - min_x, max_y - min_y, max_z - min_z)
    if span <= 0.0001:
        return

    scale = target_span / span
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5

    for obj in objects:
        obj.location.x -= center_x
        obj.location.y -= center_y
        obj.location.z -= min_z - base_z
        obj.scale *= scale

    bpy.context.view_layer.update()


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def replace_all_materials(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)
    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.material_index = 0


def shade_smooth(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True


def add_bevel(obj: bpy.types.Object, width: float = 0.06, segments: int = 4) -> None:
    modifier = obj.modifiers.new(name="Bevel", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "NONE"


def reset_uv_full_face(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.reset()
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def mesh_object(
    name: str,
    vertices: List[Tuple[float, float, float]],
    faces: List[List[int]],
    material: bpy.types.Material,
    *,
    location: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    scale: Tuple[float, float, float] | None = None,
    smooth: bool = False,
    bevel: float | None = None,
    bevel_segments: int = 2,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    if scale is not None:
        obj.scale = scale
    assign_material(obj, material)
    if bevel is not None and bevel > 0:
        add_bevel(obj, bevel, bevel_segments)
    if smooth:
        shade_smooth(obj)
    return obj


def build_dodecahedron(radius: float = 1.0) -> Tuple[List[Tuple[float, float, float]], List[List[int]]]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=(0.0, 0.0, 0.0))
    temp = bpy.context.active_object
    source_mesh = temp.data
    face_centers = [poly.center.copy() for poly in source_mesh.polygons]

    vertices = [(center.x, center.y, center.z) for center in face_centers]
    faces: List[List[int]] = []

    for source_vertex in source_mesh.vertices:
        incident = [poly.index for poly in source_mesh.polygons if source_vertex.index in poly.vertices]
        center = source_vertex.co.copy()
        normal = center.normalized()
        reference = (face_centers[incident[0]] - center).normalized()
        tangent = reference
        bitangent = normal.cross(tangent).normalized()

        def angle(face_index: int) -> float:
            offset = face_centers[face_index] - center
            return math.atan2(offset.dot(bitangent), offset.dot(tangent))

        ordered = sorted(incident, key=angle)
        a = Vector(vertices[ordered[0]])
        b = Vector(vertices[ordered[1]])
        c = Vector(vertices[ordered[2]])
        face_normal = (b - a).cross(c - a)
        face_center = sum((Vector(vertices[index]) for index in ordered), Vector((0.0, 0.0, 0.0))) / len(ordered)
        if face_normal.dot(face_center) < 0:
            ordered.reverse()
        faces.append(ordered)

    temp_mesh = temp.data
    bpy.data.objects.remove(temp, do_unlink=True)
    if temp_mesh.users == 0:
        bpy.data.meshes.remove(temp_mesh)

    return vertices, faces


def cube(
    name: str,
    location: Tuple[float, float, float],
    scale: Tuple[float, float, float],
    material: bpy.types.Material,
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    add_bevel(obj, bevel)
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def plane(
    name: str,
    location: Tuple[float, float, float],
    scale: Tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation: Tuple[float, float, float] = (math.radians(90), 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    return obj


def sphere(
    name: str,
    location: Tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    scale: Tuple[float, float, float] | None = None,
    subdivisions: int = 3,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if scale is not None:
        obj.scale = scale
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def ellipsoid_sphere(
    name: str,
    location: Tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    *,
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0),
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    subdivisions: int = 3,
) -> bpy.types.Object:
    obj = sphere(name, location, radius, material, scale=scale, subdivisions=subdivisions)
    obj.rotation_euler = rotation
    return obj


def cylinder(
    name: str,
    location: Tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 32,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def cone(
    name: str,
    location: Tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    material: bpy.types.Material,
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 24,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def torus(
    name: str,
    location: Tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material: bpy.types.Material,
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
        major_segments=48,
        minor_segments=18,
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def ngon_prism(
    name: str,
    location: Tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int,
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    scale: Tuple[float, float, float] | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    if scale is not None:
        obj.scale = scale
    assign_material(obj, material)
    shade_smooth(obj)
    return obj


def curve_tube(
    name: str,
    points: List[Tuple[float, float, float]],
    bevel_depth: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name=name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 10
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, value in zip(spline.points, points):
        point.co = (value[0], value[1], value[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def flame_shape(
    name: str,
    points: List[Tuple[float, float]],
    material: bpy.types.Material,
    *,
    location: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0),
    extrude: float = 0.014,
    bevel_depth: float = 0.010,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name=name, type="CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "BOTH"
    curve.extrude = extrude
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 5
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, value in zip(spline.points, points):
        point.co = (value[0], value[1], 0.0, 1.0)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    obj.scale = scale
    assign_material(obj, material)
    return obj


def import_glb_meshes(path: str, prefix: str) -> List[bpy.types.Object]:
    existing = {obj.name for obj in bpy.context.scene.objects}
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [
        obj
        for obj in bpy.context.scene.objects
        if obj.name not in existing and obj.type == "MESH"
    ]
    for index, obj in enumerate(imported):
        obj.name = f"{prefix}_{index}"
    return imported


def joinable(objects: Iterable[bpy.types.Object]) -> List[bpy.types.Object]:
    return [obj for obj in objects if obj is not None]


def join_objects(objects: Iterable[bpy.types.Object], name: str) -> bpy.types.Object | None:
    join_targets = [obj for obj in objects if obj is not None]
    if not join_targets:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in join_targets:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = join_targets[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def apply_modifier(obj: bpy.types.Object, modifier: bpy.types.Modifier) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def apply_boolean_difference(target: bpy.types.Object, cutters: Iterable[bpy.types.Object], name: str) -> None:
    joined_cutter = join_objects(cutters, f"{name}_cutter")
    if joined_cutter is None:
        return
    modifier = target.modifiers.new(name=name, type="BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = joined_cutter
    apply_modifier(target, modifier)
    bpy.data.objects.remove(joined_cutter, do_unlink=True)
    shade_smooth(target)


def apply_voxel_remesh(
    obj: bpy.types.Object,
    name: str,
    *,
    voxel_size: float = 0.06,
    adaptivity: float = 0.0,
) -> None:
    modifier = obj.modifiers.new(name=name, type="REMESH")
    modifier.mode = "VOXEL"
    modifier.voxel_size = voxel_size
    if hasattr(modifier, "adaptivity"):
        modifier.adaptivity = adaptivity
    if hasattr(modifier, "use_smooth_shade"):
        modifier.use_smooth_shade = True
    apply_modifier(obj, modifier)
    shade_smooth(obj)


def make_coccus(name: str, color: str) -> List[bpy.types.Object]:
    texture_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "assets", "rendered25d", "coccus texture.png")
    shell = create_organic_overlay_material(
        f"{name}_shell",
        color,
        texture_path,
        accent_hex="#D4FFDA",
        metallic=0.10,
        roughness=0.18,
        transmission=0.14,
        emission_strength=0.45,
        overlay_factor=0.72,
        mapping_scale=(0.28, 0.28, 0.28),
        bump_strength=0.16,
        contrast=1.55,
        brightness=-0.03,
    )
    core = create_material(f"{name}_core", "#E9FFF1", accent_hex=color, metallic=0.0, roughness=0.08, transmission=0.2, emission_strength=2.6)
    cluster = [
        ((-0.46, -0.04, 0.14), 0.35),
        ((-0.12, -0.18, 0.08), 0.33),
        ((0.24, -0.12, 0.14), 0.34),
        ((0.52, 0.12, 0.10), 0.29),
        ((0.10, 0.16, 0.20), 0.36),
        ((-0.24, 0.22, 0.16), 0.30),
        ((-0.56, 0.26, 0.06), 0.24),
        ((-0.18, 0.50, 0.10), 0.26),
        ((0.18, 0.48, 0.12), 0.24),
        ((0.46, 0.36, 0.04), 0.22),
        ((0.34, -0.42, 0.02), 0.23),
        ((-0.02, -0.50, 0.00), 0.25),
        ((-0.42, -0.42, 0.00), 0.22),
        ((0.02, 0.04, 0.34), 0.20),
    ]
    objects = [sphere(f"{name}_{index}", loc, radius, shell) for index, (loc, radius) in enumerate(cluster)]
    objects.append(sphere(f"{name}_core", (0.02, 0.04, 0.20), 0.15, core, subdivisions=2))
    return joinable(objects)


def make_bacillus(name: str, color: str) -> List[bpy.types.Object]:
    texture_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "assets", "generated", "pathogen_bacillus_texture_crop.png")
    shell = create_organic_overlay_material(
        f"{name}_shell",
        "#6D9E18",
        texture_path,
        accent_hex="#F7FF89",
        metallic=0.08,
        roughness=0.12,
        transmission=0.18,
        emission_strength=0.78,
        overlay_factor=0.74,
        mapping_scale=(0.58, 0.58, 0.58),
        bump_strength=0.18,
        contrast=1.62,
        brightness=-0.06,
    )
    spike_mat = create_material(
        f"{name}_spike",
        "#D8FF2B",
        accent_hex="#FFFDA3",
        metallic=0.0,
        roughness=0.14,
        transmission=0.08,
        emission_strength=2.0,
    )
    membrane_mat = create_material(
        f"{name}_membrane",
        "#B5E339",
        accent_hex="#F8FF8F",
        metallic=0.02,
        roughness=0.10,
        transmission=0.14,
        emission_strength=1.05,
    )
    set_material_alpha(membrane_mat, 0.82)
    blob_mat = create_material(
        f"{name}_blob",
        "#EEFF54",
        accent_hex="#FFFDB0",
        metallic=0.0,
        roughness=0.06,
        transmission=0.22,
        emission_strength=2.25,
    )
    core_glow = create_emissive_material(f"{name}_core_glow", "#F7FF63", 2.6)

    body_rotation = (math.radians(78), math.radians(-6), math.radians(18))
    axis = rotated_axis(body_rotation)
    center = Vector((0.0, 0.0, 0.14))
    radius = 0.44
    depth = 1.82
    axis_offset = axis * (depth * 0.5)

    reference = Vector((0.0, 0.0, 1.0))
    if abs(axis.dot(reference)) > 0.92:
        reference = Vector((0.0, 1.0, 0.0))
    normal_a = axis.cross(reference).normalized()
    normal_b = axis.cross(normal_a).normalized()

    def body_point(along: float) -> Vector:
        return (
            center
            + axis * along
            + normal_a * (0.16 * math.sin((along + 0.16) * 2.45) + 0.05 * along)
            + normal_b * (0.07 * math.cos(along * 2.15))
        )

    body_segments = [
        (-0.82, 0.30, (0.88, 1.04, 0.92)),
        (-0.54, 0.40, (1.08, 0.98, 0.94)),
        (-0.22, 0.48, (1.22, 1.02, 0.96)),
        (0.10, 0.44, (1.10, 0.96, 0.92)),
        (0.42, 0.39, (1.02, 0.94, 0.88)),
        (0.74, 0.31, (0.86, 1.02, 0.90)),
    ]
    objects = []
    for index, (along, segment_radius, segment_scale) in enumerate(body_segments):
        loc = body_point(along)
        objects.append(
            sphere(
                f"{name}_segment_{index}",
                tuple(loc),
                segment_radius,
                shell,
                scale=segment_scale,
                subdivisions=3,
            )
        )

    membrane_specs = [
        (-0.48, 0.18, 0.05, 0.23, (1.22, 0.92, 0.84)),
        (-0.06, -0.16, 0.08, 0.26, (1.38, 0.94, 0.86)),
        (0.42, 0.12, -0.02, 0.22, (1.16, 0.88, 0.82)),
    ]
    for index, (along, off_a, off_b, bubble_radius, scale) in enumerate(membrane_specs):
        loc = body_point(along) + normal_a * off_a + normal_b * off_b
        objects.append(sphere(f"{name}_membrane_{index}", tuple(loc), bubble_radius, membrane_mat, scale=scale, subdivisions=2))

    blob_specs = [
        (-0.60, 0.10, 0.06, 0.23, (1.46, 1.02, 0.90)),
        (-0.30, -0.14, 0.11, 0.17, (1.16, 0.92, 0.80)),
        (-0.08, 0.18, -0.05, 0.15, (0.94, 0.90, 0.84)),
        (0.18, -0.16, -0.03, 0.26, (1.52, 1.00, 0.88)),
        (0.50, 0.08, 0.10, 0.18, (1.16, 0.94, 0.82)),
        (0.08, -0.02, 0.12, 0.11, (0.82, 0.82, 0.78)),
        (0.66, -0.10, -0.04, 0.13, (1.06, 0.90, 0.78)),
    ]
    for index, (along, off_a, off_b, blob_radius, scale) in enumerate(blob_specs):
        loc = body_point(along) + normal_a * off_a + normal_b * off_b
        objects.append(sphere(f"{name}_blob_{index}", tuple(loc), blob_radius, blob_mat, scale=scale, subdivisions=2))

    curve_points = []
    for step in range(10):
        t = -0.64 + step * (1.28 / 9)
        wave_a = math.sin(step * 0.9) * 0.08
        wave_b = math.cos(step * 0.75) * 0.05
        loc = body_point(t) + normal_a * wave_a + normal_b * wave_b
        curve_points.append((loc.x, loc.y, loc.z))
    objects.append(curve_tube(f"{name}_gene", curve_points, 0.035, core_glow))

    spike_t_values = (-0.78, -0.58, -0.36, -0.14, 0.08, 0.30, 0.52, 0.74)
    spike_angles = (0, 60, 120, 180, 240, 300)
    for row, along in enumerate(spike_t_values):
        row_twist = math.radians(18 if row % 2 else 0)
        for angle_deg in spike_angles:
            angle = math.radians(angle_deg) + row_twist
            radial = (normal_a * math.cos(angle) + normal_b * math.sin(angle)).normalized()
            local_radius = 0.43 + 0.07 * math.cos((along + 0.1) * 2.7)
            loc = body_point(along) + radial * (local_radius * 1.04)
            direction = (radial * 1.0 + axis * 0.05).normalized()
            rot = direction.to_track_quat("Z", "Y").to_euler()
            spike_len = 0.46 + (0.20 * (0.5 + 0.5 * math.cos(angle * 1.9 + along * 3.0)))
            objects.append(
                cone(
                    f"{name}_spike_{row}_{angle_deg}",
                    tuple(loc),
                    0.045,
                    0.002,
                    spike_len,
                    spike_mat,
                    rotation=tuple(rot),
                    vertices=12,
                )
            )

    return joinable(objects)


def make_spirillum(name: str, color: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex="#97FFF1", metallic=0.08, roughness=0.22, emission_strength=0.7)
    points = []
    for i in range(18):
        t = i / 17.0
        x = -1.0 + t * 2.0
        y = math.sin(t * math.pi * 2.5) * 0.28
        z = math.cos(t * math.pi * 1.5) * 0.10
        points.append((x, y, z))
    spiral = curve_tube(f"{name}_curve", points, 0.18, shell)
    spiral.rotation_euler = (math.radians(6), math.radians(4), math.radians(18))
    return [spiral]


def make_influenza(name: str, color: str) -> List[bpy.types.Object]:
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "generated_3d",
        "pathogen_influenza_hunyuan.glb",
    )
    if os.path.exists(model_path):
        shell = create_material(
            f"{name}_shell",
            "#C53531",
            accent_hex="#FFB6B0",
            metallic=0.03,
            roughness=0.22,
            transmission=0.02,
            emission_strength=0.12,
        )
        ring_mat = create_material(
            f"{name}_ring",
            "#F6AAA9",
            accent_hex="#FFF0F0",
            metallic=0.0,
            roughness=0.06,
            transmission=0.18,
            emission_strength=0.42,
        )
        imported = import_glb_meshes(model_path, name)
        for obj in imported:
            replace_all_materials(obj, shell)
            if hasattr(obj.data, "use_auto_smooth"):
                obj.data.use_auto_smooth = True
            shade_smooth(obj)
            obj.rotation_euler = (math.radians(16), 0.0, math.radians(14))

        center_bump = sphere(f"{name}_center_bump", (0.0, -0.66, 0.30), 0.080, shell, subdivisions=2)
        center_ring = torus(
            f"{name}_center_ring",
            (0.0, -0.71, 0.28),
            0.11,
            0.028,
            ring_mat,
            rotation=(math.radians(90), 0.0, 0.0),
        )
        halo = sphere(
            f"{name}_halo",
            (0.0, 0.0, 0.16),
            0.42,
            create_emissive_material(f"{name}_halo_mat", "#FF8A86", 0.72),
            scale=(1.08, 1.08, 0.64),
            subdivisions=2,
        )
        return imported + [center_bump, center_ring, halo]

    shell = create_material(
        f"{name}_shell",
        "#F09B99",
        accent_hex="#FFDADA",
        metallic=0.02,
        roughness=0.12,
        transmission=0.16,
        emission_strength=0.22,
    )
    shell_inner = create_material(
        f"{name}_shell_inner",
        "#B52021",
        accent_hex="#FFB0AB",
        metallic=0.02,
        roughness=0.10,
        transmission=0.0,
        emission_strength=0.10,
    )
    spike_mat = create_material(
        f"{name}_spike",
        "#CB3A38",
        accent_hex="#FFD4D0",
        metallic=0.02,
        roughness=0.12,
        transmission=0.04,
        emission_strength=0.24,
    )
    ring_mat = create_material(
        f"{name}_ring",
        "#F6AAA9",
        accent_hex="#FFF0F0",
        metallic=0.0,
        roughness=0.06,
        transmission=0.18,
        emission_strength=0.42,
    )

    objects: List[bpy.types.Object] = []
    body_outer = sphere(f"{name}_body_outer", (0.0, 0.0, 0.21), 0.74, shell, subdivisions=3)
    body_outer.scale = (1.0, 1.0, 0.97)
    body_inner = sphere(f"{name}_body_inner", (0.0, 0.0, 0.18), 0.63, shell_inner, subdivisions=3)
    body_inner.scale = (0.94, 0.94, 0.88)
    objects.extend([body_outer, body_inner])

    spike_count = 24
    for index in range(spike_count):
        t = index + 0.5
        z = 1.0 - 2.0 * t / spike_count
        radius = math.sqrt(max(0.0, 1.0 - z * z))
        theta = math.pi * (3.0 - math.sqrt(5.0)) * t
        direction = Vector((math.cos(theta) * radius, math.sin(theta) * radius, z)).normalized()
        direction.z *= 0.92
        direction = direction.normalized()
        stem_depth = 0.30 + 0.06 * (0.5 + 0.5 * math.sin(index * 1.9))
        base = direction * 0.63 + Vector((0.0, 0.0, 0.21))
        stem_center = direction * (0.79 + 0.03 * math.sin(index * 2.1)) + Vector((0.0, 0.0, 0.21))
        rot = direction.to_track_quat("Z", "Y").to_euler()
        stem = cone(
            f"{name}_spike_{index}",
            tuple(stem_center),
            0.060,
            0.020,
            stem_depth,
            spike_mat,
            rotation=tuple(rot),
            vertices=28,
        )
        tip_bulb = sphere(
            f"{name}_spike_tip_{index}",
            tuple(direction * (0.91 + 0.04 * math.sin(index * 1.3)) + Vector((0.0, 0.0, 0.21))),
            0.058 + 0.006 * math.sin(index * 1.1),
            spike_mat,
            subdivisions=2,
        )
        root_blend = sphere(f"{name}_spike_root_{index}", tuple(base), 0.034, spike_mat, subdivisions=1)
        objects.extend([stem, tip_bulb, root_blend])

    center_bump = sphere(f"{name}_center_bump", (0.0, -0.54, 0.28), 0.082, spike_mat, subdivisions=2)
    center_ring = torus(
        f"{name}_center_ring",
        (0.0, -0.57, 0.26),
        0.10,
        0.024,
        ring_mat,
        rotation=(math.radians(90), 0.0, 0.0),
    )
    objects.extend([center_bump, center_ring])
    return joinable(objects)


def make_retrovirus(name: str, color: str) -> List[bpy.types.Object]:
    glass_shell = create_material(
        f"{name}_glass",
        "#A81326",
        accent_hex="#FF6A74",
        metallic=0.10,
        roughness=0.10,
        transmission=0.62,
        emission_strength=0.62,
    )
    set_material_alpha(glass_shell, 0.22)
    edge_glow = create_emissive_material(f"{name}_edge", "#B81429", 1.95)
    core_mat = create_material(
        f"{name}_core",
        "#4C0610",
        accent_hex="#B21A2F",
        metallic=0.18,
        roughness=0.20,
        transmission=0.0,
        emission_strength=0.18,
    )
    inner_glow = create_emissive_material(f"{name}_inner_glow", "#C61D33", 0.55)

    vertices, faces = build_dodecahedron(0.98)
    shell_rotation = (math.radians(18), math.radians(0), math.radians(18))
    shell = mesh_object(
        f"{name}_shell",
        vertices,
        faces,
        glass_shell,
        location=(0.0, 0.0, 0.18),
        rotation=shell_rotation,
        bevel=0.012,
    )
    shell_edges = mesh_object(
        f"{name}_shell_edges",
        vertices,
        faces,
        edge_glow,
        location=(0.0, 0.0, 0.18),
        rotation=shell_rotation,
    )
    wireframe = shell_edges.modifiers.new(name="Wireframe", type="WIREFRAME")
    wireframe.thickness = 0.050
    wireframe.offset = 0.0
    wireframe.use_even_offset = True

    core_cube = cube(
        f"{name}_core_cube",
        (0.0, 0.0, 0.18),
        (0.38, 0.38, 0.38),
        core_mat,
        bevel=0.045,
    )
    core_cube.rotation_euler = (math.radians(8), math.radians(0), math.radians(45))

    glow_cube = cube(
        f"{name}_glow_cube",
        (0.0, 0.0, 0.18),
        (0.26, 0.26, 0.26),
        inner_glow,
        bevel=0.035,
    )
    glow_cube.rotation_euler = (math.radians(8), math.radians(0), math.radians(45))

    return [shell, shell_edges, core_cube, glow_cube]


def make_phage(name: str, color: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex="#FFD8C6", metallic=0.14, roughness=0.18, emission_strength=0.65)
    leg_mat = create_material(f"{name}_legs", "#FFE4D5", accent_hex=color, metallic=0.0, roughness=0.12, emission_strength=1.4)
    objects = [
        sphere(f"{name}_head", (0.0, 0.0, 0.74), 0.36, shell, subdivisions=1),
        cylinder(f"{name}_tail", (0.0, 0.0, 0.18), 0.08, 0.88, leg_mat),
    ]
    for index, angle in enumerate((0, 60, 120, 180, 240, 300)):
        radians = math.radians(angle)
        foot_x = math.cos(radians) * 0.42
        foot_y = math.sin(radians) * 0.42
        leg = curve_tube(
            f"{name}_leg_{index}",
            [
                (0.0, 0.0, -0.22),
                (foot_x * 0.55, foot_y * 0.55, -0.44),
                (foot_x, foot_y, -0.68),
            ],
            0.045,
            leg_mat,
        )
        objects.append(leg)
    return joinable(objects)


def make_mold(name: str, color: str) -> List[bpy.types.Object]:
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "generated_3d",
        "pathogen_mold_hunyuan.glb",
    )
    if not os.path.exists(model_path):
        shell = create_material(f"{name}_shell", color, accent_hex="#F5CCFF", metallic=0.06, roughness=0.28, emission_strength=0.62)
        spore_mat = create_material(f"{name}_spore", "#FFE3FF", accent_hex=color, metallic=0.0, roughness=0.08, emission_strength=2.4)
        branches = [
            [(0.0, 0.0, 0.0), (0.0, 0.2, 0.35), (0.0, 0.48, 0.7)],
            [(0.0, 0.0, 0.0), (0.26, -0.05, 0.28), (0.58, -0.1, 0.52)],
            [(0.0, 0.0, 0.0), (-0.24, -0.08, 0.26), (-0.55, -0.22, 0.48)],
        ]
        objects = []
        for index, branch in enumerate(branches):
            objects.append(curve_tube(f"{name}_branch_{index}", branch, 0.12 if index == 0 else 0.09, shell))
            objects.append(sphere(f"{name}_spore_{index}", branch[-1], 0.11, spore_mat, subdivisions=2))
        return joinable(objects)

    shell = create_material(
        f"{name}_shell",
        color,
        accent_hex="#F5CCFF",
        metallic=0.04,
        roughness=0.20,
        transmission=0.08,
        emission_strength=0.78,
    )
    imported = import_glb_meshes(model_path, name)
    for obj in imported:
        replace_all_materials(obj, shell)
        if hasattr(obj.data, "use_auto_smooth"):
            obj.data.use_auto_smooth = True
        shade_smooth(obj)

    for obj in imported:
        obj.rotation_euler = (math.radians(18), 0.0, math.radians(18))

    halo = sphere(
        f"{name}_halo",
        (0.0, 0.0, 0.10),
        0.34,
        create_emissive_material(f"{name}_halo_mat", "#C56AF0", 1.7),
        scale=(1.08, 1.08, 0.58),
        subdivisions=2,
    )
    return imported + [halo]


def make_yeast(name: str, color: str) -> List[bpy.types.Object]:
    shell = create_proofed_dough_material(
        f"{name}_shell",
        color,
        crumb_hex="#F8ECDD",
        blush_hex="#E7B0D9",
        roughness=0.60,
        bump_strength=0.090,
    )
    cavity = create_material(
        f"{name}_cavity",
        "#F9E6DB",
        accent_hex="#E9C2E5",
        metallic=0.0,
        roughness=0.66,
        transmission=0.0,
        emission_strength=0.04,
    )

    dough_puffs = [
        ellipsoid_sphere(
            f"{name}_main",
            (0.0, -0.06, 0.22),
            0.62,
            shell,
            scale=(1.08, 0.86, 1.22),
            rotation=(math.radians(-5), math.radians(3), math.radians(8)),
            subdivisions=4,
        ),
        ellipsoid_sphere(
            f"{name}_bud_a",
            (0.50, 0.16, 0.40),
            0.34,
            shell,
            scale=(0.96, 0.78, 1.04),
            rotation=(math.radians(6), math.radians(-8), math.radians(20)),
        ),
        ellipsoid_sphere(
            f"{name}_bud_b",
            (-0.46, 0.12, 0.22),
            0.31,
            shell,
            scale=(1.00, 0.82, 0.98),
            rotation=(math.radians(4), math.radians(10), math.radians(-16)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_crown",
            (0.04, 0.02, 0.62),
            0.27,
            shell,
            scale=(0.94, 0.86, 0.78),
            rotation=(math.radians(12), 0.0, math.radians(-4)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_front_puff",
            (0.18, -0.30, 0.15),
            0.24,
            shell,
            scale=(1.18, 0.84, 0.72),
            rotation=(math.radians(-8), math.radians(-10), math.radians(16)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_left_base",
            (-0.18, -0.18, 0.08),
            0.22,
            shell,
            scale=(1.22, 0.88, 0.62),
            rotation=(math.radians(-14), math.radians(8), math.radians(-10)),
            subdivisions=2,
        ),
    ]
    blob = join_objects(dough_puffs, f"{name}_blob")
    if blob is None:
        return []
    apply_voxel_remesh(blob, f"{name}_puff_remesh", voxel_size=0.055)

    cutters = [
        ellipsoid_sphere(
            f"{name}_alveolus_0",
            (0.06, -0.38, 0.60),
            0.23,
            cavity,
            scale=(1.10, 0.82, 0.66),
            rotation=(math.radians(-8), math.radians(-4), math.radians(6)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_alveolus_1",
            (-0.34, -0.22, 0.62),
            0.17,
            cavity,
            scale=(1.06, 0.84, 0.66),
            rotation=(math.radians(6), math.radians(12), math.radians(-14)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_alveolus_2",
            (0.38, -0.04, 0.72),
            0.16,
            cavity,
            scale=(1.02, 0.88, 0.62),
            rotation=(math.radians(10), math.radians(-6), math.radians(22)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_alveolus_3",
            (0.24, 0.08, 0.86),
            0.15,
            cavity,
            scale=(1.16, 0.80, 0.56),
            rotation=(math.radians(18), 0.0, math.radians(18)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_alveolus_4",
            (-0.26, 0.12, 0.72),
            0.16,
            cavity,
            scale=(1.08, 0.86, 0.60),
            rotation=(math.radians(16), math.radians(6), math.radians(-18)),
            subdivisions=2,
        ),
        cylinder(
            f"{name}_tunnel_0",
            (0.28, -0.10, 0.56),
            0.082,
            0.34,
            cavity,
            rotation=(math.radians(74), math.radians(10), math.radians(18)),
            vertices=24,
        ),
        cylinder(
            f"{name}_tunnel_1",
            (-0.12, 0.10, 0.64),
            0.070,
            0.28,
            cavity,
            rotation=(math.radians(68), math.radians(-14), math.radians(-28)),
            vertices=24,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_0",
            (-0.05, -0.08, 0.86),
            0.09,
            cavity,
            scale=(1.0, 0.92, 0.58),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_1",
            (0.48, 0.18, 0.56),
            0.10,
            cavity,
            scale=(1.02, 0.86, 0.58),
            rotation=(math.radians(10), 0.0, math.radians(22)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_2",
            (-0.46, 0.14, 0.44),
            0.09,
            cavity,
            scale=(0.98, 0.84, 0.56),
            rotation=(math.radians(8), 0.0, math.radians(-16)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_3",
            (0.18, 0.30, 0.48),
            0.08,
            cavity,
            scale=(1.02, 0.86, 0.54),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_4",
            (-0.18, -0.40, 0.42),
            0.09,
            cavity,
            scale=(1.10, 0.90, 0.58),
            rotation=(math.radians(-8), 0.0, math.radians(-6)),
            subdivisions=2,
        ),
        ellipsoid_sphere(
            f"{name}_dimple_5",
            (0.34, -0.30, 0.34),
            0.08,
            cavity,
            scale=(1.08, 0.84, 0.56),
            rotation=(math.radians(-4), math.radians(-6), math.radians(18)),
            subdivisions=2,
        ),
    ]
    apply_boolean_difference(blob, cutters, f"{name}_craters")
    apply_voxel_remesh(blob, f"{name}_crumb_remesh", voxel_size=0.043)

    scar_nodes = [
        ellipsoid_sphere(
            f"{name}_scar_{index}",
            loc,
            radius,
            cavity,
            scale=scale,
            rotation=rotation,
            subdivisions=2,
        )
        for index, (loc, radius, scale, rotation) in enumerate(
            [
                ((0.42, 0.04, 0.30), 0.065, (1.18, 0.86, 0.58), (math.radians(14), 0.0, math.radians(18))),
                ((-0.28, 0.28, 0.22), 0.055, (1.10, 0.82, 0.56), (math.radians(8), 0.0, math.radians(-12))),
                ((0.04, -0.48, 0.22), 0.060, (1.16, 0.88, 0.60), (math.radians(-10), math.radians(-4), math.radians(6))),
            ]
        )
    ]
    halo = ellipsoid_sphere(
        f"{name}_halo",
        (0.0, -0.02, 0.18),
        0.45,
        create_emissive_material(f"{name}_halo_mat", "#C37BDE", 0.78),
        scale=(1.12, 1.04, 0.56),
        subdivisions=2,
    )
    return [blob, halo] + scar_nodes


def make_spore(name: str, color: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex="#DDBBFF", metallic=0.12, roughness=0.22, emission_strength=0.74)
    core = create_material(f"{name}_core", "#F1D9FF", accent_hex=color, metallic=0.0, roughness=0.08, emission_strength=2.8)
    objects = [sphere(f"{name}_core", (0.0, 0.0, 0.12), 0.34, core, subdivisions=2)]
    for index, angle in enumerate(range(0, 360, 45)):
        radians = math.radians(angle)
        loc = (math.cos(radians) * 0.48, math.sin(radians) * 0.48, 0.10)
        rot = Vector((loc[0], loc[1], 0.18)).normalized().to_track_quat("Z", "Y").to_euler()
        objects.append(cone(f"{name}_ray_{index}", loc, 0.12, 0.01, 0.66, shell, rotation=tuple(rot)))
    return joinable(objects)


def make_capsule_piece(name: str, color: str, accent: str, rotation_z: float = 18.0) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex=accent, metallic=0.08, roughness=0.18, transmission=0.16, emission_strength=0.8)
    band = create_material(f"{name}_band", accent, accent_hex=color, metallic=0.0, roughness=0.1, emission_strength=2.4)
    angle = math.radians(rotation_z)
    objects = [
        cylinder(f"{name}_body", (0.0, 0.0, 0.14), 0.34, 1.36, shell, rotation=(0.0, math.radians(90), angle)),
        sphere(f"{name}_cap_a", (-0.56, 0.0, 0.14), 0.34, shell),
        sphere(f"{name}_cap_b", (0.56, 0.0, 0.14), 0.34, shell),
        torus(f"{name}_band", (0.0, 0.0, 0.14), 0.36, 0.05, band, rotation=(math.radians(90), 0.0, angle)),
    ]
    return joinable(objects)


def make_penicillin_piece(name: str, color: str) -> List[bpy.types.Object]:
    glass_shell = create_material(
        f"{name}_glass",
        "#67EDFF",
        accent_hex="#D7FFFF",
        metallic=0.02,
        roughness=0.08,
        transmission=0.72,
        emission_strength=0.90,
    )
    set_material_alpha(glass_shell, 0.18)
    edge_glow = create_emissive_material(f"{name}_edge", "#00A9D6", 2.1)
    capsule_shell = create_material(
        f"{name}_capsule_shell",
        color,
        accent_hex="#E7FFFF",
        metallic=0.04,
        roughness=0.08,
        transmission=0.24,
        emission_strength=1.1,
    )
    capsule_core = create_material(
        f"{name}_capsule_core",
        "#9CFAFF",
        accent_hex=color,
        metallic=0.0,
        roughness=0.06,
        transmission=0.10,
        emission_strength=2.0,
    )
    band = create_material(
        f"{name}_band",
        "#E8F8FF",
        accent_hex="#89F4FF",
        metallic=0.24,
        roughness=0.12,
        transmission=0.0,
        emission_strength=1.1,
    )

    vertices, faces = build_dodecahedron(0.98)
    shell = mesh_object(
        f"{name}_shell",
        vertices,
        faces,
        glass_shell,
        location=(0.0, 0.0, 0.18),
        rotation=(math.radians(16), math.radians(0), math.radians(18)),
        bevel=0.01,
    )
    shell_edges = mesh_object(
        f"{name}_shell_edges",
        vertices,
        faces,
        edge_glow,
        location=(0.0, 0.0, 0.18),
        rotation=(math.radians(16), math.radians(0), math.radians(18)),
    )
    wireframe = shell_edges.modifiers.new(name="Wireframe", type="WIREFRAME")
    wireframe.thickness = 0.048
    wireframe.offset = 0.0
    wireframe.use_even_offset = True

    capsule_rotation = (math.radians(18), math.radians(-14), math.radians(22))
    capsule_axis = rotated_axis(capsule_rotation)
    capsule_center = Vector((0.04, -0.02, 0.23))
    shell_radius = 0.29
    shell_depth = 1.08
    shell_offset = capsule_axis * (shell_depth * 0.5)
    core_radius = 0.18
    core_depth = 0.80
    core_offset = capsule_axis * (core_depth * 0.5)
    capsule = [
        cylinder(f"{name}_body", tuple(capsule_center), shell_radius, shell_depth, capsule_shell, rotation=capsule_rotation),
        sphere(f"{name}_cap_a", tuple(capsule_center + shell_offset), shell_radius, capsule_shell, subdivisions=2),
        sphere(f"{name}_cap_b", tuple(capsule_center - shell_offset), shell_radius, capsule_shell, subdivisions=2),
        torus(f"{name}_band_ring", tuple(capsule_center), 0.30, 0.042, band, rotation=(math.radians(108), math.radians(-14), math.radians(22))),
        cylinder(f"{name}_core", tuple(capsule_center), core_radius, core_depth, capsule_core, rotation=capsule_rotation, vertices=20),
        sphere(f"{name}_core_a", tuple(capsule_center + core_offset), core_radius, capsule_core, subdivisions=2),
        sphere(f"{name}_core_b", tuple(capsule_center - core_offset), core_radius, capsule_core, subdivisions=2),
    ]

    inner_halo = sphere(f"{name}_halo", (0.0, 0.0, 0.16), 0.18, edge_glow, scale=(0.9, 0.9, 0.55), subdivisions=2)
    return [shell, shell_edges, inner_halo] + capsule


def make_fluconazole_piece(name: str, color: str) -> List[bpy.types.Object]:
    glass_shell = create_material(
        f"{name}_glass",
        "#F1C8FF",
        accent_hex="#FFF0FF",
        metallic=0.02,
        roughness=0.08,
        transmission=0.72,
        emission_strength=0.92,
    )
    set_material_alpha(glass_shell, 0.20)
    edge_glow = create_emissive_material(f"{name}_edge", "#A95AD9", 2.0)
    capsule_shell = create_material(
        f"{name}_capsule_shell",
        color,
        accent_hex="#FFF1FF",
        metallic=0.04,
        roughness=0.08,
        transmission=0.24,
        emission_strength=1.08,
    )
    capsule_core = create_material(
        f"{name}_capsule_core",
        "#FFCCFF",
        accent_hex=color,
        metallic=0.0,
        roughness=0.06,
        transmission=0.10,
        emission_strength=2.0,
    )
    band = create_material(
        f"{name}_band",
        "#FFF4FF",
        accent_hex="#F0A3FF",
        metallic=0.24,
        roughness=0.12,
        transmission=0.0,
        emission_strength=1.05,
    )

    vertices, faces = build_dodecahedron(0.98)
    shell_rotation = (math.radians(16), 0.0, math.radians(-18))
    shell = mesh_object(
        f"{name}_shell",
        vertices,
        faces,
        glass_shell,
        location=(0.0, 0.0, 0.18),
        rotation=shell_rotation,
        bevel=0.01,
    )
    shell_edges = mesh_object(
        f"{name}_shell_edges",
        vertices,
        faces,
        edge_glow,
        location=(0.0, 0.0, 0.18),
        rotation=shell_rotation,
    )
    wireframe = shell_edges.modifiers.new(name="Wireframe", type="WIREFRAME")
    wireframe.thickness = 0.048
    wireframe.offset = 0.0
    wireframe.use_even_offset = True

    capsule_rotation = (math.radians(18), math.radians(14), math.radians(-22))
    capsule_axis = rotated_axis(capsule_rotation)
    capsule_center = Vector((-0.04, -0.02, 0.23))
    shell_radius = 0.29
    shell_depth = 1.08
    shell_offset = capsule_axis * (shell_depth * 0.5)
    core_radius = 0.18
    core_depth = 0.80
    core_offset = capsule_axis * (core_depth * 0.5)
    capsule = [
        cylinder(f"{name}_body", tuple(capsule_center), shell_radius, shell_depth, capsule_shell, rotation=capsule_rotation),
        sphere(f"{name}_cap_a", tuple(capsule_center + shell_offset), shell_radius, capsule_shell, subdivisions=2),
        sphere(f"{name}_cap_b", tuple(capsule_center - shell_offset), shell_radius, capsule_shell, subdivisions=2),
        torus(f"{name}_band_ring", tuple(capsule_center), 0.30, 0.042, band, rotation=(math.radians(108), math.radians(14), math.radians(-22))),
        cylinder(f"{name}_core", tuple(capsule_center), core_radius, core_depth, capsule_core, rotation=capsule_rotation, vertices=20),
        sphere(f"{name}_core_a", tuple(capsule_center + core_offset), core_radius, capsule_core, subdivisions=2),
        sphere(f"{name}_core_b", tuple(capsule_center - core_offset), core_radius, capsule_core, subdivisions=2),
    ]

    inner_halo = sphere(f"{name}_halo", (0.0, 0.0, 0.16), 0.18, edge_glow, scale=(0.9, 0.9, 0.55), subdivisions=2)
    return [shell, shell_edges, inner_halo] + capsule


def make_tetracycline_piece(name: str, color: str) -> List[bpy.types.Object]:
    glass_shell = create_material(
        f"{name}_glass",
        "#5CC9FF",
        accent_hex="#E0FAFF",
        metallic=0.02,
        roughness=0.08,
        transmission=0.72,
        emission_strength=0.90,
    )
    set_material_alpha(glass_shell, 0.18)
    edge_glow = create_emissive_material(f"{name}_edge", "#FF9A2D", 2.05)
    capsule_shell = create_material(
        f"{name}_capsule_shell",
        color,
        accent_hex="#FFD18C",
        metallic=0.04,
        roughness=0.08,
        transmission=0.24,
        emission_strength=1.12,
    )
    capsule_core = create_material(
        f"{name}_capsule_core",
        "#FFAD4B",
        accent_hex="#65EAFF",
        metallic=0.0,
        roughness=0.06,
        transmission=0.10,
        emission_strength=2.05,
    )
    band = create_material(
        f"{name}_band",
        "#FFF3E2",
        accent_hex="#FF9F3C",
        metallic=0.24,
        roughness=0.12,
        transmission=0.0,
        emission_strength=1.08,
    )

    vertices, faces = build_dodecahedron(0.98)
    shell = mesh_object(
        f"{name}_shell",
        vertices,
        faces,
        glass_shell,
        location=(0.0, 0.0, 0.18),
        rotation=(math.radians(16), math.radians(0), math.radians(18)),
        bevel=0.01,
    )
    shell_edges = mesh_object(
        f"{name}_shell_edges",
        vertices,
        faces,
        edge_glow,
        location=(0.0, 0.0, 0.18),
        rotation=(math.radians(16), math.radians(0), math.radians(18)),
    )
    wireframe = shell_edges.modifiers.new(name="Wireframe", type="WIREFRAME")
    wireframe.thickness = 0.048
    wireframe.offset = 0.0
    wireframe.use_even_offset = True

    capsule_rotation = (math.radians(18), math.radians(-14), math.radians(22))
    capsule_axis = rotated_axis(capsule_rotation)
    capsule_center = Vector((0.04, -0.02, 0.23))
    shell_radius = 0.29
    shell_depth = 1.08
    shell_offset = capsule_axis * (shell_depth * 0.5)
    core_radius = 0.18
    core_depth = 0.80
    core_offset = capsule_axis * (core_depth * 0.5)
    capsule = [
        cylinder(f"{name}_body", tuple(capsule_center), shell_radius, shell_depth, capsule_shell, rotation=capsule_rotation),
        sphere(f"{name}_cap_a", tuple(capsule_center + shell_offset), shell_radius, capsule_shell, subdivisions=2),
        sphere(f"{name}_cap_b", tuple(capsule_center - shell_offset), shell_radius, capsule_shell, subdivisions=2),
        torus(f"{name}_band_ring", tuple(capsule_center), 0.30, 0.042, band, rotation=(math.radians(108), math.radians(-14), math.radians(22))),
        cylinder(f"{name}_core", tuple(capsule_center), core_radius, core_depth, capsule_core, rotation=capsule_rotation, vertices=20),
        sphere(f"{name}_core_a", tuple(capsule_center + core_offset), core_radius, capsule_core, subdivisions=2),
        sphere(f"{name}_core_b", tuple(capsule_center - core_offset), core_radius, capsule_core, subdivisions=2),
    ]

    inner_halo = sphere(f"{name}_halo", (0.0, 0.0, 0.16), 0.18, edge_glow, scale=(0.9, 0.9, 0.55), subdivisions=2)
    return [shell, shell_edges, inner_halo] + capsule


def make_vial_piece(name: str, color: str, accent: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex=accent, metallic=0.05, roughness=0.12, transmission=0.24, emission_strength=0.9)
    cap = create_material(f"{name}_cap", "#D7F9FF", accent_hex=accent, metallic=0.22, roughness=0.18, emission_strength=1.6)
    objects = [
        cylinder(f"{name}_body", (0.0, 0.0, 0.12), 0.28, 1.18, shell, rotation=(0.0, math.radians(90), math.radians(12))),
        sphere(f"{name}_bulb_a", (-0.50, 0.0, 0.12), 0.26, shell),
        sphere(f"{name}_bulb_b", (0.50, 0.0, 0.12), 0.20, cap, subdivisions=2),
        cylinder(f"{name}_cap", (0.72, 0.0, 0.12), 0.11, 0.20, cap, rotation=(0.0, math.radians(90), math.radians(12))),
    ]
    return joinable(objects)


def make_shield_piece(name: str, color: str, accent: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex=accent, metallic=0.1, roughness=0.22, transmission=0.16, emission_strength=0.95)
    core = create_material(f"{name}_core", accent, accent_hex=color, metallic=0.0, roughness=0.10, emission_strength=2.6)
    base = sphere(f"{name}_core_shell", (0.0, 0.0, 0.1), 0.46, shell, scale=(0.86, 0.72, 1.08))
    ring = torus(f"{name}_ring", (0.0, 0.0, 0.16), 0.58, 0.06, core, rotation=(math.radians(72), 0.0, math.radians(28)))
    inner = sphere(f"{name}_inner", (0.0, 0.0, 0.16), 0.18, core, subdivisions=2)
    return [base, ring, inner]


def make_tamiflu_piece(name: str, color: str) -> List[bpy.types.Object]:
    image_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "public",
        "assets",
        "generated",
        "medicine_tamiflu_cropped.png",
    )
    emblem = create_image_plane_material(
        f"{name}_emblem",
        image_path,
        emission_strength=1.0,
    )
    hero = plane(
        f"{name}_hero",
        (0.0, -0.04, 0.22),
        (0.92, 1.04, 1.0),
        emblem,
    )
    return [hero]


def make_zidovudine_piece(name: str, color: str) -> List[bpy.types.Object]:
    glass_shell = create_material(
        f"{name}_glass",
        "#D8FFF2",
        accent_hex="#FBFFFE",
        metallic=0.02,
        roughness=0.07,
        transmission=0.78,
        emission_strength=0.35,
    )
    set_material_alpha(glass_shell, 0.22)
    lime_fill = create_material(
        f"{name}_fill",
        "#A8FF4D",
        accent_hex="#F2FFAF",
        metallic=0.0,
        roughness=0.08,
        transmission=0.16,
        emission_strength=1.25,
    )
    cap = create_material(
        f"{name}_cap",
        "#1E2228",
        accent_hex="#5E6B76",
        metallic=0.38,
        roughness=0.22,
        transmission=0.0,
        emission_strength=0.08,
    )
    ring_blue = create_emissive_material(f"{name}_ring_blue", "#14E2FF", 1.55)
    ring_lime = create_emissive_material(f"{name}_ring_lime", "#B8FF4A", 1.1)
    particle = create_emissive_material(f"{name}_particle", "#C8FF7C", 1.0)

    objects: List[bpy.types.Object] = []
    objects.append(torus(f"{name}_ring_back", (0.0, 0.0, 0.16), 0.64, 0.030, ring_blue, rotation=(math.radians(90), 0.0, math.radians(8))))
    objects.append(torus(f"{name}_ring_mid", (0.0, 0.0, 0.16), 0.54, 0.018, ring_blue, rotation=(math.radians(90), 0.0, math.radians(-24))))
    objects.append(torus(f"{name}_ring_lime_a", (0.0, 0.0, 0.16), 0.80, 0.032, ring_lime, rotation=(math.radians(90), math.radians(18), math.radians(26))))
    objects.append(torus(f"{name}_ring_lime_b", (0.0, 0.0, 0.16), 0.80, 0.032, ring_lime, rotation=(math.radians(90), math.radians(-18), math.radians(206))))

    vial_rotation = (0.0, math.radians(90), 0.0)
    center = Vector((0.0, 0.0, 0.18))
    body_depth = 1.10
    body_radius = 0.18
    axis = rotated_axis(vial_rotation, (0.0, 0.0, 1.0))
    offset = axis * (body_depth * 0.5)
    objects.append(cylinder(f"{name}_body", tuple(center), body_radius, body_depth, glass_shell, rotation=vial_rotation))
    objects.append(sphere(f"{name}_cap_a", tuple(center + offset), body_radius, glass_shell, subdivisions=2))
    objects.append(sphere(f"{name}_cap_b", tuple(center - offset), body_radius, glass_shell, subdivisions=2))

    inner_center = center + Vector((0.0, 0.0, -0.02))
    inner_depth = 0.86
    inner_radius = 0.11
    inner_offset = axis * (inner_depth * 0.5)
    objects.append(cylinder(f"{name}_fill_body", tuple(inner_center), inner_radius, inner_depth, lime_fill, rotation=vial_rotation, vertices=20))
    objects.append(sphere(f"{name}_fill_a", tuple(inner_center + inner_offset), inner_radius, lime_fill, subdivisions=2))
    objects.append(sphere(f"{name}_fill_b", tuple(inner_center - inner_offset), inner_radius, lime_fill, subdivisions=2))

    objects.append(cylinder(f"{name}_top_cap", tuple(center + axis * 0.36), 0.21, 0.12, cap, rotation=vial_rotation, vertices=28))
    objects.append(cylinder(f"{name}_bottom_cap", tuple(center - axis * 0.36), 0.21, 0.12, cap, rotation=vial_rotation, vertices=28))

    particle_positions = [
        (-0.08, 0.02, 0.20),
        (0.05, -0.02, 0.34),
        (0.03, 0.01, 0.02),
    ]
    for index, pos in enumerate(particle_positions):
        objects.append(sphere(f"{name}_particle_{index}", pos, 0.024, particle, subdivisions=1))

    return joinable(objects)


def make_crystal_piece(name: str, color: str, accent: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex=accent, metallic=0.18, roughness=0.16, transmission=0.10, emission_strength=1.1)
    core = create_material(f"{name}_core", accent, accent_hex=color, metallic=0.0, roughness=0.08, emission_strength=2.8)
    body = sphere(f"{name}_body", (0.0, 0.0, 0.18), 0.50, shell, subdivisions=1)
    body.scale = (0.88, 0.88, 1.22)
    spikes = []
    for index, angle in enumerate((0, 90, 180, 270)):
        radians = math.radians(angle)
        loc = (math.cos(radians) * 0.38, math.sin(radians) * 0.38, 0.22)
        rot = Vector((loc[0], loc[1], 0.5)).normalized().to_track_quat("Z", "Y").to_euler()
        spikes.append(cone(f"{name}_spike_{index}", loc, 0.10, 0.02, 0.56, core, rotation=tuple(rot)))
    return [body] + spikes


def make_droplet_piece(name: str, color: str, accent: str) -> List[bpy.types.Object]:
    shell = create_material(f"{name}_shell", color, accent_hex=accent, metallic=0.06, roughness=0.12, transmission=0.22, emission_strength=1.0)
    body = sphere(f"{name}_body", (0.0, 0.0, 0.12), 0.52, shell, scale=(0.72, 0.72, 1.18))
    tip = sphere(f"{name}_tip", (0.0, 0.0, 0.70), 0.16, shell, scale=(0.44, 0.44, 0.82), subdivisions=2)
    ring = torus(f"{name}_ring", (0.0, 0.0, 0.20), 0.30, 0.045, shell, rotation=(math.radians(90), 0.0, 0.0))
    return [body, tip, ring]


def make_pathogen(name: str) -> List[bpy.types.Object]:
    color = PATHOGEN_COLORS[name]
    builders = {
        "coccus": make_coccus,
        "bacillus": make_bacillus,
        "spirillum": make_spirillum,
        "influenza": make_influenza,
        "retrovirus": make_retrovirus,
        "phage": make_phage,
        "mold": make_mold,
        "yeast": make_yeast,
        "spore": make_spore,
    }
    return builders[name](name, color)


def make_medicine(name: str) -> List[bpy.types.Object]:
    color = MEDICINE_COLORS[name]
    builders = {
        "penicillin": make_penicillin_piece,
        "tetracycline": make_tetracycline_piece,
        "streptomycin": lambda n, c: make_vial_piece(n, c, "#E1FFF8"),
        "tamiflu": make_tamiflu_piece,
        "zidovudine": make_zidovudine_piece,
        "interferon": lambda n, c: make_crystal_piece(n, c, "#FBFFD0"),
        "fluconazole": make_fluconazole_piece,
        "nystatin": lambda n, c: make_shield_piece(n, c, "#FFE5FF"),
        "amphotericin": lambda n, c: make_crystal_piece(n, c, "#F0D7FF"),
    }
    return builders[name](name, color)


def make_tile_material_pair(name: str, accent_hex: str) -> Tuple[bpy.types.Material, bpy.types.Material]:
    shell = create_material(
        f"{name}_shell",
        "#0E1824",
        accent_hex=accent_hex,
        metallic=0.10,
        roughness=0.38,
        transmission=0.0,
        emission_strength=0.06,
    )
    inset = create_material(
        f"{name}_inset",
        "#07111A",
        accent_hex=accent_hex,
        metallic=0.02,
        roughness=0.28,
        transmission=0.0,
        emission_strength=0.24,
    )
    return shell, inset


def make_world1_hazard_wall_tile(name: str) -> List[bpy.types.Object]:
    texture_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "assets", "generated", "tile_wall_transparent.png")
    textured = create_image_box_material(f"{name}_textured", texture_path, base_hex="#181E25", metallic=0.34, roughness=0.32)
    body = cube(f"{name}_cube", (0.0, 0.0, 0.0), (0.98, 0.98, 0.98), textured, bevel=0.06)
    reset_uv_full_face(body)
    return [body]


def make_empty_tile(name: str, accent_hex: str) -> List[bpy.types.Object]:
    shell, inset = make_tile_material_pair(name, accent_hex)
    objects = [
        cube(f"{name}_base", (0.0, 0.0, -0.02), (1.12, 1.12, 0.18), shell, bevel=0.12),
        cube(f"{name}_socket", (0.0, 0.0, -0.10), (0.82, 0.82, 0.08), inset, bevel=0.10),
        torus(f"{name}_ring", (0.0, 0.0, 0.04), 0.72, 0.05, inset, rotation=(math.radians(90), 0.0, 0.0)),
    ]
    return joinable(objects)


def make_wall_tile(name: str, accent_hex: str) -> List[bpy.types.Object]:
    if name.endswith("_w1"):
        return make_world1_hazard_wall_tile(name)

    shell, inset = make_tile_material_pair(name, accent_hex)
    barrier = create_material(
        f"{name}_barrier",
        "#253645",
        accent_hex=accent_hex,
        metallic=0.26,
        roughness=0.34,
        emission_strength=0.10,
    )
    objects = make_empty_tile(name, accent_hex)
    objects.extend(
        [
            cube(f"{name}_wall", (0.0, 0.0, 0.30), (0.86, 0.34, 0.28), barrier, bevel=0.09),
            cube(f"{name}_fin_a", (-0.62, 0.0, 0.22), (0.12, 0.82, 0.18), inset, bevel=0.07),
            cube(f"{name}_fin_b", (0.62, 0.0, 0.22), (0.12, 0.82, 0.18), inset, bevel=0.07),
        ]
    )
    return joinable(objects)


def cleanup(objects: Iterable[bpy.types.Object]) -> None:
    for obj in objects:
        if obj and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def render_asset(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    output_path: str,
) -> None:
    scene.camera = camera
    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    ensure_dir(args.output)
    clear_scene()
    piece_camera, tile_camera, wall_camera = setup_scene(args.size)
    scene = bpy.context.scene
    asset = args.asset.strip().lower()

    def wants(asset_name: str) -> bool:
        return asset in ("", "all") or asset == asset_name.lower()

    for pathogen in PATHOGEN_COLORS:
        asset_name = f"pathogen_{pathogen}"
        if not wants(asset_name):
            continue
        objects = make_pathogen(pathogen)
        if pathogen == "coccus":
            target_span = 2.72
            base_z = 0.0
        elif pathogen == "bacillus":
            target_span = 2.84
            base_z = 0.0
        elif pathogen == "influenza":
            target_span = 2.22
            base_z = -0.24
        elif pathogen == "yeast":
            target_span = 2.55
            base_z = -0.18
        else:
            target_span = 2.55
            base_z = 0.0
        normalize_objects(objects, target_span=target_span, base_z=base_z)
        render_asset(scene, piece_camera, os.path.join(args.output, f"{asset_name}.png"))
        cleanup(objects)

    for medicine in MEDICINE_COLORS:
        asset_name = f"medicine_{medicine}"
        if not wants(asset_name):
            continue
        objects = make_medicine(medicine)
        base_z = -0.48 if medicine == "tamiflu" else 0.0
        normalize_objects(objects, target_span=2.35, base_z=base_z)
        render_asset(scene, piece_camera, os.path.join(args.output, f"{asset_name}.png"))
        cleanup(objects)

    if wants("tile_empty"):
        generic_empty = make_empty_tile("tile_empty", WORLD_TILE_ACCENTS[0])
        normalize_objects(generic_empty, target_span=3.25, base_z=-0.02)
        render_asset(scene, tile_camera, os.path.join(args.output, "tile_empty.png"))
        cleanup(generic_empty)

    if wants("tile_wall"):
        generic_wall = make_wall_tile("tile_wall", "#FFD740")
        normalize_objects(generic_wall, target_span=3.25, base_z=-0.02)
        render_asset(scene, tile_camera, os.path.join(args.output, "tile_wall.png"))
        cleanup(generic_wall)

    for world, accent in WORLD_TILE_ACCENTS.items():
        if world == 0:
            continue
        empty_name = f"tile_empty_w{world}"
        if wants(empty_name):
            empty_tile = make_empty_tile(empty_name, accent)
            normalize_objects(empty_tile, target_span=3.25, base_z=-0.02)
            render_asset(scene, tile_camera, os.path.join(args.output, f"{empty_name}.png"))
            cleanup(empty_tile)

        wall_name = f"tile_wall_w{world}"
        if wants(wall_name):
            wall_tile = make_wall_tile(wall_name, accent)
            if world == 1:
                normalize_objects(wall_tile, target_span=2.1, base_z=0.0)
                render_asset(scene, wall_camera, os.path.join(args.output, f"{wall_name}.png"))
            else:
                normalize_objects(wall_tile, target_span=3.25, base_z=-0.02)
                render_asset(scene, tile_camera, os.path.join(args.output, f"{wall_name}.png"))
            cleanup(wall_tile)

    print(f"Rendered 2.5D assets to {args.output}")


if __name__ == "__main__":
    main()
