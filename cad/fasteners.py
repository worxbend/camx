"""Export a threaded opposite-side axle reference; printed copies are fit-only."""
import json
from pathlib import Path
from build123d import (Align, Box, Cylinder, Face, Helix, Mesher, Wire,
                      export_brep, export_step, export_stl, sweep)
import trimesh


def export_axle(out: Path):
    # Same 16 mm under-head length and 8.5 x 3.5 mm head as the assembly envelope.
    # Simplified right-hand M5 x 0.8 thread: this is not a tolerance-qualified screw.
    align = (Align.CENTER, Align.CENTER, Align.MIN)
    path = Helix(.8, 15.2, 2.01, center=(0, 0, 3.9))
    profile = Face(Wire.make_polygon([
        (1.96, 0, 3.58), (2.5, 0, 3.9), (1.96, 0, 4.22)
    ], close=True))
    screw = Cylinder(2.02, 16, align=align).translate((0, 0, 3.5))
    screw += sweep(profile, path=path, is_frenet=True)
    screw += Cylinder(4.25, 3.5, align=align)
    screw -= Box(5.5, 1.2, 1.4, align=align).translate((0, 0, -.1))
    assert screw.is_valid and len(screw.solids()) == 1
    dest = out / 'fasteners'
    dest.mkdir(parents=True, exist_ok=True)
    stem = dest / 'idler_axle_M5x16_FIT_ONLY'
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
        '# Opposite-side cradle axle\n\n'
        'M5 × 16 mm under-head length; right-hand 0.8 mm pitch; '
        '8.5 mm diameter × 3.5 mm slotted head. Simplified thread geometry, '
        'not an ISO tolerance-qualified manufacturing drawing.\n\n'
        '**Printed model: fit checks only. Use a metal M5 axle screw and nut '
        'for the loaded camera assembly.** Do not force the printed thread '
        'into a metal nut. Print upright, head on the bed; inspect the recessed '
        'head slot in your slicer. No material or printer profile is included.\n\n'
        'The 16 mm length matches the current assembly reference, but confirm '
        'your actual washer/bearing/spacer stack and ensure the tip and captive '
        'nut clear the camera before tightening. The pending cradle-width '
        'correction may require a different axle length.\n', encoding='utf-8')
    (dest / 'validation.json').write_text(json.dumps({
        'passed': True, 'valid_single_solid': True, 'watertight': True,
        'consistent_winding': True, 'bounds_mm': list(screw.bounding_box().size),
        'intended_use': 'fit-check reference only', 'physical_load_tested': False
    }, indent=2) + '\n')
    print('Exported threaded M5x16 axle fit reference', flush=True)


if __name__ == '__main__':
    export_axle(Path(__file__).resolve().parents[1] / 'exports')
