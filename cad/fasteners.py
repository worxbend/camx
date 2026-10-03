"""Export a threaded opposite-side axle reference; printed copies are fit-only."""
import json
from pathlib import Path
from build123d import (Align, Box, Cylinder, Face, Helix, Mesher, Wire,
                      export_brep, export_step, export_stl, sweep, RegularPolygon, extrude, Pos, Rot)
import trimesh


def printed_joint(parameters):
    """Paired printed shoulder axle/nut; dimensions are not ISO M5 threads."""
    align = (Align.CENTER, Align.CENTER, Align.MIN)
    length = parameters['idler_axle_length']
    shoulder = (parameters['idler_outer_washer_stack'] +
                parameters['idler_bearing_width'] + parameters['idler_spacer_length'])
    nut_height = parameters['idler_nut_thickness']
    head_height = 3.5
    thread_start = head_height + shoulder
    # Smooth 4.85 mm journal in the 5 mm bearing, followed by a short paired thread.
    head = Cylinder(4.25, head_height, align=align)
    head = head.fillet(.35, head.edges())
    pin = head + Pos(0, 0, head_height) * Cylinder(2.425, shoulder, align=align)
    pin += Pos(0, 0, head_height) * Cylinder(2.02, length, align=align)
    path = Helix(.8, length-shoulder, 2.01, center=(0, 0, thread_start))
    profile = Face(Wire.make_polygon([(1.98, 0, thread_start-.3),
        (2.425, 0, thread_start), (1.98, 0, thread_start+.3)], close=True))
    thread = sweep(profile, path=path, is_frenet=True)
    # Clip the thread at the physical end; no tip projects past the 12 mm stack.
    thread &= Pos(0, 0, head_height) * Cylinder(2.5, length, align=align)
    pin += thread
    pin -= Pos(0, 0, -.1) * Box(5.5, 1.2, 1.2, align=align)
    nut = extrude(RegularPolygon(8 / (3 ** .5), 6), amount=nut_height)
    # The female tool is the same helical phase, with 0.15 mm radial allowance.
    cutter_start = -.8
    tool_path = Helix(.8, nut_height+1.6, 2.16, center=(0, 0, cutter_start))
    tool_profile = Face(Wire.make_polygon([(2.13, 0, cutter_start-.3),
        (2.575, 0, cutter_start), (2.13, 0, cutter_start+.3)], close=True))
    tool = sweep(tool_profile, path=tool_path, is_frenet=True)
    tool += Pos(0, 0, -1) * Cylinder(2.17, nut_height+2, align=align)
    nut -= tool
    assert pin.is_valid and len(pin.solids()) == 1
    assert nut.is_valid and len(nut.solids()) == 1
    seated_nut = Pos(0, 0, thread_start) * nut
    intersection = pin & seated_nut
    assert intersection is None or intersection.volume < .001, 'Paired threads intersect'
    return pin, nut


def export_printed_joint(out, parameters):
    pin, nut = printed_joint(parameters)
    dest = out / 'fasteners'
    dest.mkdir(parents=True, exist_ok=True)
    from model import projection
    records = {}
    align = (Align.CENTER, Align.CENTER, Align.MIN)
    outer_washer = Cylinder(3.75, parameters['idler_outer_washer_stack'], align=align) - Cylinder(2.6, parameters['idler_outer_washer_stack'], align=align)
    inner_spacer = Cylinder(3.75, parameters['idler_spacer_length'], align=align) - Cylinder(2.6, parameters['idler_spacer_length'], align=align)
    for name, shape in [('printed_idler_shoulder_axle', pin), ('printed_idler_captive_nut', nut), ('printed_idler_outer_washer', outer_washer), ('printed_idler_inner_spacer', inner_spacer)]:
        # Axle lies horizontally so layer paths run along its length; supports needed.
        posed = Rot(0, 90, 0) * shape if 'axle' in name else shape
        bounds = posed.bounding_box()
        posed = Pos(-bounds.center().X, -bounds.center().Y, -bounds.min.Z) * posed
        stem = dest / name
        export_stl(posed, str(stem.with_suffix('.stl')), tolerance=.025, angular_tolerance=.1)
        mesher = Mesher(); mesher.add_shape(posed, linear_deflection=.025, angular_deflection=.1)
        mesher.write(str(stem.with_suffix('.3mf')))
        export_step(shape, str(stem.with_suffix('.step')))
        export_brep(shape, str(stem.with_suffix('.brep')))
        mesh = trimesh.load(stem.with_suffix('.stl'), force='mesh')
        assert mesh.is_watertight and mesh.is_winding_consistent and len(mesh.split()) == 1
        for ext in ['obj', 'ply', 'off']: mesh.export(stem.with_suffix('.' + ext))
        projection(shape, stem, (45, -65, 35))
        records[name] = {'valid_single_solid': True, 'watertight': True,
            'bounds_mm': list(posed.bounding_box().size)}
    from render import render_scene
    render_scene([('printed_axle', pin, (0,0,0)), ('printed_nut', nut, (11,0,0))],
        out/'images/printed_idler_joint', 'Printed bearing-side shoulder axle + captive nut',
        notes='Paired print threads · 4.85 mm smooth journal · prototype: test fit and load')
    seated = Pos(0,0,3.5+parameters['idler_outer_washer_stack']+parameters['idler_bearing_width']+parameters['idler_spacer_length']) * nut
    overlap = pin & seated
    (dest/'printed_joint_validation.json').write_text(json.dumps({
        'passed': True, 'parts': records, 'paired_thread_intersection_mm3':
        0 if overlap is None else overlap.volume, 'physical_fit_verified': False,
        'physical_load_tested': False}, indent=2)+'\n')
    (dest/'PRINTED_JOINT.md').write_text(
        '# Printed cradle axle and captive nut\n\n'
        'Print both printed_idler_shoulder_axle and printed_idler_captive_nut. '
        'They form a matched pair, not a precision ISO M5 thread and not intended '
        'for mixing with metal M5 fasteners. No metal screw or nut is needed.\n\n'
        '12 mm under-head length; 4.85 mm smooth bearing journal; 8.5 x 3.5 mm '
        'head; 0.8 mm paired thread pitch; 0.15 mm radial thread allowance; '
        '8 mm across-flats x 2.7 mm captive nut. Retain the existing 625 bearing, '
        '2.5 mm outer washer stack and 1.4 mm inner-race spacer; matching '
        'printed washer and spacer files are included.\n\n'
        'PETG or suitable nylon, 0.12 mm layers, 100% infill and at least four '
        'walls recommended. Axle STL/3MF is horizontal, requiring supports '
        'under the shaft and head; inspect and clean the threads gently. Nut '
        'prints flat. Trial-fit the pair away from the mechanism before assembly. '
        'Never force a tight printed thread. Slicer/material profiles are not included.\n\n'
        'Place the nut in the cradle hex pocket, then insert the axle from the '
        'bearing side through washers, bearing and spacer. Turn gently by hand '
        'until retained with free rotation; do not torque-tighten or preload the '
        'bearing. Check camera clearance. Test first without the camera, then '
        'with a supported dummy load. A printed axle has not been load-qualified; '
        'use a camera safety tether and replace parts showing cracking, creep, '
        'looseness or damaged threads. The former FIT_ONLY file is not this joint.\n',
        encoding='utf-8')
    print('Exported paired printed shoulder axle and captive nut', flush=True)


def export_axle(out: Path, parameters=None):
    length = (parameters or {}).get("idler_axle_length", 12)
    # Same 12 mm under-head length and 8.5 x 3.5 mm head as the assembly envelope.
    # Simplified right-hand M5 x 0.8 thread: this is not a tolerance-qualified screw.
    align = (Align.CENTER, Align.CENTER, Align.MIN)
    path = Helix(.8, length-.8, 2.01, center=(0, 0, 3.9))
    profile = Face(Wire.make_polygon([
        (1.96, 0, 3.58), (2.5, 0, 3.9), (1.96, 0, 4.22)
    ], close=True))
    screw = Cylinder(2.02, length, align=align).translate((0, 0, 3.5))
    screw += sweep(profile, path=path, is_frenet=True)
    screw += Cylinder(4.25, 3.5, align=align)
    screw -= Box(5.5, 1.2, 1.4, align=align).translate((0, 0, -.1))
    assert screw.is_valid and len(screw.solids()) == 1
    dest = out / 'fasteners'
    dest.mkdir(parents=True, exist_ok=True)
    stem = dest / f'idler_axle_M5x{length}_FIT_ONLY'
    for old in dest.glob('idler_axle_M5x16_FIT_ONLY.*'):
        old.unlink()
    export_stl(screw, str(stem.with_suffix('.stl')), tolerance=.025, angular_tolerance=.1)
    mesh = Mesher()
    mesh.add_shape(screw, linear_deflection=.025, angular_deflection=.1)
    mesh.write(str(stem.with_suffix('.3mf')))
    export_step(screw, str(stem.with_suffix('.step')))
    export_brep(screw, str(stem.with_suffix('.brep')))
    triangle_mesh = trimesh.load(stem.with_suffix('.stl'), force='mesh')
    assert triangle_mesh.is_watertight and triangle_mesh.is_winding_consistent
    for ext in ['obj', 'ply', 'off']:
        triangle_mesh.export(stem.with_suffix('.' + ext))
    from model import projection
    projection(screw, stem, (45, -65, 35))
    (dest / 'README.md').write_text(
        '# Printed joint and legacy screw reference\n\n'
        'For the requested printed assembly use printed_idler_shoulder_axle and '
        'printed_idler_captive_nut, plus the supplied washer/spacer. See '
        'PRINTED_JOINT.md. The FIT_ONLY file below is a separate legacy reference.\n\n'
        'M5 × 12 mm under-head length; right-hand 0.8 mm pitch; '
        '8.5 mm diameter × 3.5 mm slotted head. Simplified thread geometry, '
        'not an ISO tolerance-qualified manufacturing drawing.\n\n'
        '**Printed model: fit checks only. Use a metal M5 axle screw and nut '
        'for the loaded camera assembly.** Do not force the printed thread '
        'into a metal nut. Print upright, head on the bed; inspect the recessed '
        'head slot in your slicer. No material or printer profile is included.\n\n'
        'The 12 mm length matches the current assembly reference, but confirm '
        'your actual washer/bearing/spacer stack and ensure the tip and captive '
        'nut clear the camera before tightening. Use a 2.5 mm outer washer '
        'stack and a 2.7 mm M5 jam nut.\n', encoding='utf-8')
    (dest / 'validation.json').write_text(json.dumps({
        'passed': True, 'valid_single_solid': True, 'watertight': True,
        'consistent_winding': True, 'bounds_mm': list(screw.bounding_box().size),
        'intended_use': 'fit-check reference only', 'physical_load_tested': False
    }, indent=2) + '\n')
    print('Exported threaded M5x12 axle fit reference', flush=True)
    if parameters is None:
        parameters = json.loads((Path(__file__).parent/'parameters.json').read_text())
    export_printed_joint(out, parameters)


if __name__ == '__main__':
    export_axle(Path(__file__).resolve().parents[1] / 'exports')
