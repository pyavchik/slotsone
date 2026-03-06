"""
Blender CLI script to render Book of Dead slot symbols as gold metallic icons.
Run: blender --background --python render_bod_symbols.py

Renders 10 symbols at 512x512 transparent PNG with gold embossed style on dark stone bases.
"""

import bpy
import bmesh
import math
import os
import sys

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          '..', 'public', 'symbols', 'book-of-dead')
RESOLUTION = 512

# ──────────────────────────────────────────────────────────────────────
# Utility: clear scene
# ──────────────────────────────────────────────────────────────────────

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)
    # Clean orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        if block.users == 0:
            bpy.data.textures.remove(block)
    for block in bpy.data.curves:
        if block.users == 0:
            bpy.data.curves.remove(block)
    for block in bpy.data.fonts:
        if block.users == 0:
            bpy.data.fonts.remove(block)


# ──────────────────────────────────────────────────────────────────────
# Materials
# ──────────────────────────────────────────────────────────────────────

def create_gold_material(name="Gold"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)
    # Gold color
    principled.inputs['Base Color'].default_value = (0.83, 0.62, 0.13, 1.0)
    principled.inputs['Metallic'].default_value = 1.0
    principled.inputs['Roughness'].default_value = 0.25
    # Slight specular tint
    if 'Specular' in principled.inputs:
        principled.inputs['Specular'].default_value = 0.8

    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return mat


def create_dark_stone_material(name="DarkStone"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (600, 0)

    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (200, 0)
    principled.inputs['Base Color'].default_value = (0.04, 0.035, 0.05, 1.0)
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.85

    # Add noise for stone texture
    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-200, 0)
    noise.inputs['Scale'].default_value = 12.0
    noise.inputs['Detail'].default_value = 8.0

    bump = nodes.new('ShaderNodeBump')
    bump.location = (0, -200)
    bump.inputs['Strength'].default_value = 0.15

    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], principled.inputs['Normal'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return mat


def create_accent_material(name="Accent", color=(0.1, 0.6, 0.3, 1.0)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)
    principled.inputs['Base Color'].default_value = color
    principled.inputs['Metallic'].default_value = 0.7
    principled.inputs['Roughness'].default_value = 0.3

    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return mat


# ──────────────────────────────────────────────────────────────────────
# Scene setup
# ──────────────────────────────────────────────────────────────────────

def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 128
    scene.render.resolution_x = RESOLUTION
    scene.render.resolution_y = RESOLUTION
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    # World - very dark with slight warm ambient
    world = bpy.data.worlds.get('World')
    if not world:
        world = bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    bg = wnodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (0.01, 0.008, 0.015, 1.0)
    bg.inputs['Strength'].default_value = 0.3
    wo = wnodes.new('ShaderNodeOutputWorld')
    wlinks.new(bg.outputs['Background'], wo.inputs['Surface'])


def setup_camera():
    cam_data = bpy.data.cameras.new('Camera')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 3.2
    cam_obj = bpy.data.objects.new('Camera', cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = (0, -5, 0)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.camera = cam_obj
    return cam_obj


def setup_lighting():
    # Key light - warm gold
    key = bpy.data.lights.new('KeyLight', 'AREA')
    key.energy = 150
    key.color = (1.0, 0.9, 0.7)
    key.size = 4
    key_obj = bpy.data.objects.new('KeyLight', key)
    bpy.context.collection.objects.link(key_obj)
    key_obj.location = (2, -3, 3)
    key_obj.rotation_euler = (math.radians(50), math.radians(10), math.radians(-20))

    # Fill light - cool blue
    fill = bpy.data.lights.new('FillLight', 'AREA')
    fill.energy = 40
    fill.color = (0.6, 0.7, 1.0)
    fill.size = 3
    fill_obj = bpy.data.objects.new('FillLight', fill)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (-3, -2, 1)
    fill_obj.rotation_euler = (math.radians(70), math.radians(-30), math.radians(20))

    # Rim light
    rim = bpy.data.lights.new('RimLight', 'AREA')
    rim.energy = 80
    rim.color = (1.0, 0.85, 0.6)
    rim.size = 2
    rim_obj = bpy.data.objects.new('RimLight', rim)
    bpy.context.collection.objects.link(rim_obj)
    rim_obj.location = (0, 2, 2.5)
    rim_obj.rotation_euler = (math.radians(-40), 0, 0)


# ──────────────────────────────────────────────────────────────────────
# Base pedestal (reusable)
# ──────────────────────────────────────────────────────────────────────

def create_base():
    """Create a dark stone rounded-rect base."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    base = bpy.context.active_object
    base.name = 'Base'
    base.scale = (1.3, 0.12, 1.3)
    base.location = (0, 0.12, 0)

    # Bevel edges
    bevel = base.modifiers.new('Bevel', 'BEVEL')
    bevel.width = 0.08
    bevel.segments = 4

    stone_mat = create_dark_stone_material()
    base.data.materials.append(stone_mat)
    return base


# ──────────────────────────────────────────────────────────────────────
# Symbol creators
# ──────────────────────────────────────────────────────────────────────

def create_text_symbol(text, name, scale=0.9, extrude=0.12, material=None):
    """Create extruded 3D text centered on the base."""
    font_curve = bpy.data.curves.new(name, 'FONT')
    font_curve.body = text
    font_curve.extrude = extrude
    font_curve.bevel_depth = 0.015
    font_curve.bevel_resolution = 3
    font_curve.align_x = 'CENTER'
    font_curve.align_y = 'CENTER'

    obj = bpy.data.objects.new(name, font_curve)
    bpy.context.collection.objects.link(obj)

    obj.scale = (scale, scale, scale)
    obj.location = (0, 0, 0)
    # Rotate to face camera (text is in XY plane, camera looks down -Y)
    obj.rotation_euler = (math.radians(90), 0, 0)

    if material is None:
        material = create_gold_material(f"Gold_{name}")
    obj.data.materials.append(material)
    return obj


def create_book_symbol():
    """Create a 3D open book shape."""
    # Left page
    bpy.ops.mesh.primitive_cube_add(size=1)
    left = bpy.context.active_object
    left.name = 'BookLeft'
    left.scale = (0.6, 0.04, 0.8)
    left.location = (-0.35, 0, 0)
    left.rotation_euler = (0, math.radians(-8), 0)

    # Right page
    bpy.ops.mesh.primitive_cube_add(size=1)
    right = bpy.context.active_object
    right.name = 'BookRight'
    right.scale = (0.6, 0.04, 0.8)
    right.location = (0.35, 0, 0)
    right.rotation_euler = (0, math.radians(8), 0)

    # Spine
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.6)
    spine = bpy.context.active_object
    spine.name = 'BookSpine'
    spine.location = (0, 0.02, 0)
    spine.rotation_euler = (math.radians(90), 0, 0)

    gold = create_gold_material("Gold_Book")
    for obj in [left, right, spine]:
        obj.data.materials.append(gold)
        bev = obj.modifiers.new('Bevel', 'BEVEL')
        bev.width = 0.02
        bev.segments = 2

    return [left, right, spine]


def create_eye_of_horus():
    """Create a stylized Eye of Horus from primitives."""
    parts = []

    # Main eye shape - torus stretched
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.5, minor_radius=0.12,
        major_segments=48, minor_segments=12
    )
    eye = bpy.context.active_object
    eye.name = 'HorusEye'
    eye.scale = (1.0, 0.5, 0.7)
    eye.rotation_euler = (math.radians(90), 0, 0)
    parts.append(eye)

    # Pupil - sphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18)
    pupil = bpy.context.active_object
    pupil.name = 'HorusPupil'
    pupil.location = (0, -0.05, 0)
    accent = create_accent_material("HorusAccent", (0.15, 0.35, 0.85, 1.0))
    pupil.data.materials.append(accent)
    parts.append(pupil)

    # Tear drop
    bpy.ops.mesh.primitive_cone_add(radius1=0.1, radius2=0, depth=0.5)
    tear = bpy.context.active_object
    tear.name = 'HorusTear'
    tear.location = (0, 0, -0.55)
    tear.rotation_euler = (0, 0, 0)
    parts.append(tear)

    # Spiral
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.15, minor_radius=0.04,
        major_segments=24, minor_segments=8
    )
    spiral = bpy.context.active_object
    spiral.name = 'HorusSpiral'
    spiral.location = (-0.2, 0, -0.85)
    spiral.scale = (1.2, 0.6, 1.0)
    spiral.rotation_euler = (math.radians(90), 0, 0)
    parts.append(spiral)

    gold = create_gold_material("Gold_Horus")
    for p in parts:
        if not p.data.materials:
            p.data.materials.append(gold)
        bev = p.modifiers.new('Bevel', 'BEVEL')
        bev.width = 0.01
        bev.segments = 2

    return parts


def create_ankh_symbol():
    """Create an Ankh cross - used for Anubis."""
    parts = []

    # Loop (torus)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.3, minor_radius=0.06,
        major_segments=32, minor_segments=12
    )
    loop = bpy.context.active_object
    loop.name = 'AnkhLoop'
    loop.location = (0, 0, 0.5)
    loop.rotation_euler = (math.radians(90), 0, 0)
    parts.append(loop)

    # Vertical bar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.0)
    vbar = bpy.context.active_object
    vbar.name = 'AnkhVBar'
    vbar.location = (0, 0, -0.2)
    parts.append(vbar)

    # Horizontal bar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.6)
    hbar = bpy.context.active_object
    hbar.name = 'AnkhHBar'
    hbar.location = (0, 0, 0.15)
    hbar.rotation_euler = (0, 0, math.radians(90))
    parts.append(hbar)

    gold = create_gold_material("Gold_Ankh")
    for p in parts:
        p.data.materials.append(gold)
        bev = p.modifiers.new('Bevel', 'BEVEL')
        bev.width = 0.01
        bev.segments = 2

    return parts


def create_scarab_symbol():
    """Create a scarab beetle shape for Osiris."""
    parts = []

    # Body - elongated sphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45)
    body = bpy.context.active_object
    body.name = 'ScarabBody'
    body.scale = (0.8, 0.5, 1.0)
    parts.append(body)

    # Head
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22)
    head = bpy.context.active_object
    head.name = 'ScarabHead'
    head.location = (0, 0, 0.55)
    parts.append(head)

    # Left wing
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35)
    lwing = bpy.context.active_object
    lwing.name = 'ScarabLWing'
    lwing.scale = (1.2, 0.15, 0.6)
    lwing.location = (-0.6, 0, 0.1)
    lwing.rotation_euler = (0, 0, math.radians(15))
    parts.append(lwing)

    # Right wing
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35)
    rwing = bpy.context.active_object
    rwing.name = 'ScarabRWing'
    rwing.scale = (1.2, 0.15, 0.6)
    rwing.location = (0.6, 0, 0.1)
    rwing.rotation_euler = (0, 0, math.radians(-15))
    parts.append(rwing)

    # Sun disc above
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2)
    sun = bpy.context.active_object
    sun.name = 'ScarabSun'
    sun.location = (0, 0, 0.85)
    sun.scale = (1.0, 0.5, 1.0)
    accent = create_accent_material("OsirisAccent", (0.1, 0.55, 0.3, 1.0))
    sun.data.materials.append(accent)
    parts.append(sun)

    gold = create_gold_material("Gold_Scarab")
    for p in parts:
        if not p.data.materials:
            p.data.materials.append(gold)
        bev = p.modifiers.new('Bevel', 'BEVEL')
        bev.width = 0.01
        bev.segments = 2

    return parts


def create_hat_fedora():
    """Create Rich Wilde's fedora hat."""
    parts = []

    # Brim
    bpy.ops.mesh.primitive_cylinder_add(radius=0.7, depth=0.08)
    brim = bpy.context.active_object
    brim.name = 'FedoraBrim'
    brim.location = (0, 0, 0)
    parts.append(brim)

    # Crown
    bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=0.5)
    crown = bpy.context.active_object
    crown.name = 'FedoraCrown'
    crown.location = (0, 0, 0.28)
    parts.append(crown)

    # Indent on top
    bpy.ops.mesh.primitive_cube_add(size=0.3)
    indent = bpy.context.active_object
    indent.name = 'FedoraIndent'
    indent.scale = (0.8, 0.3, 0.15)
    indent.location = (0, 0, 0.55)
    parts.append(indent)

    # Band
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.39, minor_radius=0.035,
        major_segments=32, minor_segments=8
    )
    band = bpy.context.active_object
    band.name = 'FedoraBand'
    band.location = (0, 0, 0.08)
    accent = create_accent_material("WildeAccent", (0.65, 0.45, 0.1, 1.0))
    band.data.materials.append(accent)
    parts.append(band)

    gold = create_gold_material("Gold_Fedora")
    for p in parts:
        if not p.data.materials:
            p.data.materials.append(gold)
        bev = p.modifiers.new('Bevel', 'BEVEL')
        bev.width = 0.015
        bev.segments = 3

    return parts


# ──────────────────────────────────────────────────────────────────────
# Render a single symbol
# ──────────────────────────────────────────────────────────────────────

def render_symbol(symbol_name, create_fn, filename):
    print(f"Rendering {symbol_name}...")
    clear_scene()
    setup_scene()
    setup_camera()
    setup_lighting()

    base = create_base()
    parts = create_fn()
    if not isinstance(parts, list):
        parts = [parts]

    outpath = os.path.join(OUTPUT_DIR, filename)
    bpy.context.scene.render.filepath = outpath
    bpy.ops.render.render(write_still=True)
    print(f"  -> Saved {outpath}")


# ──────────────────────────────────────────────────────────────────────
# Symbol definitions
# ──────────────────────────────────────────────────────────────────────

SYMBOLS = [
    ("RichWilde", create_hat_fedora, "richwilde.png"),
    ("Osiris", create_scarab_symbol, "osiris.png"),
    ("Anubis", create_ankh_symbol, "anubis.png"),
    ("Horus", create_eye_of_horus, "horus.png"),
    ("Book", create_book_symbol, "book.png"),
    ("A", lambda: create_text_symbol("A", "Sym_A", scale=1.1, extrude=0.15), "a.png"),
    ("K", lambda: create_text_symbol("K", "Sym_K", scale=1.1, extrude=0.15), "k.png"),
    ("Q", lambda: create_text_symbol("Q", "Sym_Q", scale=1.1, extrude=0.15), "q.png"),
    ("J", lambda: create_text_symbol("J", "Sym_J", scale=1.1, extrude=0.15), "j.png"),
    ("10", lambda: create_text_symbol("10", "Sym_10", scale=0.85, extrude=0.15), "10.png"),
]


# ──────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Rendering {len(SYMBOLS)} symbols at {RESOLUTION}x{RESOLUTION}...")

    for name, create_fn, filename in SYMBOLS:
        render_symbol(name, create_fn, filename)

    print("Done! All symbols rendered.")


if __name__ == '__main__':
    main()
