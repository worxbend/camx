# Structural review — two-sided revision

The opposite 625 bearing, matching 6 mm arm plates, rounded foot supports, and M2 through-bolted tilt-servo ears improve the original cantilever arrangement. This is an engineering prototype, not a verified load-rated product. No physical durability test or finite-element analysis has been performed.

## What the added bearing changes

With a 150 g camera and an approximately 35 mm lateral offset, the original one-sided support carries a bending moment of `0.150 × 9.81 × 0.035 = 0.052 N·m`. A support at each side lets the assembly share vertical loads and reduces bending at the servo output. Load sharing depends on alignment and actual centre of gravity; it is not guaranteed to be exactly equal. The opposite bearing does not increase the servo's available drive torque or protect its plastic gears from a jam.

The 625 bearing dimensions are 5 × 16 × 5 mm ([SKF catalogue](https://cdn.skfmediahub.skf.com/api/public/0901d196802809de/pdf_preview_medium/0901d196802809de_pdf_preview_medium.pdf)). The design uses a metal M5 axle with a captive nut, two 1 mm outside washers, and a 1.4 mm inner spacer. Washers/spacer must contact the inner race only. Incorrect stack length can preload or bind the bearing. The bearing shoulder has clearance around the spacer; inspect the printed fit and the camera-side axle tip before use.

For an ideal rectangular section with the same width, changing thickness from 4 to 6 mm increases bending section modulus by `(6/4)^2 = 2.25` and elastic bending stiffness by `(6/4)^3 = 3.375`. These ratios describe a simplified section, not the strength of the printed assembly. Rounded arm-foot transitions reduce abrupt load transfer; layer adhesion, screw holes, mounting ears and print defects still govern failure.

## Torque and stability

Camera gravity torque is `mass_kg × perpendicular_offset_cm` in kgf·cm: 150 g at 1 cm is 0.15 kgf·cm; at 3 cm it is 0.45 kgf·cm, before cradle weight, acceleration and cable drag. [TowerPro lists 1.8 kgf·cm at 4.8 V as stall torque](https://towerpro.com.tw/product/sg90-7/), which is not a continuous operating rating. Balance the assembled cradle near the tilt axis and use slow movements. For heavy cameras, frequent tracking, heat, jitter or backlash, redesign around stronger servos and independent bearings on both sides.

The base footprint is 144 × 120 mm. For an illustrative measured total mass of 0.4 kg, a centre-of-gravity margin of 55 mm, and a cable pull applied 136 mm above the desk, the static tipping force is only `0.4 × 9.81 × 0.055 / 0.136 = 1.59 N`. This is approximately the weight of 162 g. Actual mass, foot placement and CG must be measured; rubber feet help sliding, but do not prevent tipping. Use the captive 1/4-20 nut to secure the device to a suitable tripod or desk fixture and leave relaxed cable loops. This design is not a monitor clamp.

## Print and commissioning checks

Use PETG, at least four perimeters, sound layer adhesion and local supports as needed. [Prusa's orientation guidance](https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135) explains why loading across layer joints can weaken a part. Inspect screw bosses and arm roots for splitting. Do not treat infill percentage as a load rating.

1. Measure all hardware and print the fit coupon. Check both tilt supports are coaxial and the empty mechanism turns freely without motor power.
2. Secure the base. Fit a dummy matching the camera's measured mass, dimensions and CG; add a loose safety tether. Keep hands clear of pinch points.
3. Centre and calibrate with horns removed. Start with narrow pulse limits and expand while measuring actual angles. Firmware angles are estimates.
4. With the dummy installed, check neutral and travel endpoints for at least 15 minutes each. Watch for creep, binding, warm servos, jitter, cable tension and screw loosening. Stop immediately if any appear; never sustain a stall.
5. Cycle slowly through the intended range, inspect the printed roots and horn fasteners, and retest after cooling. A successful bench check is preliminary evidence, not a fatigue-life certification.
6. Install the real camera only after fit, stability and electrical checks pass. Support it whenever PWM or power is removed; DISARM can let it drop.

The generated validation report checks CAD solids, exported meshes and finite sampled clearances. Hardware envelopes are provisional, and cables, full horn details and all fasteners are not collision-modeled. It cannot establish that the construction will never break.

## Symmetrical revamp

The broader 144 × 120 mm enclosure replaces the earlier 108 × 88 mm base. Matching tall shells and pivot medallions use one mirrored geometry definition, while the interiors accommodate a motor on one side and a 625 bearing on the other. A pan cowl conceals the spindle and joins the U-shaped support visually. The hollow passive shell is decorative protection; the internal plate, bearing, metal axle and fasteners carry the load. The wider footprint improves the illustrative tipping margin but does not replace securing the device. The additional shell adds moving mass; repeat torque, heat and stability measurements after assembly.
