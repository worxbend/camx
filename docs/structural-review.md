# Structural review — two-sided revision

The opposite 625 bearing, matching 6 mm arm plates, rounded foot supports, and M2 through-bolted tilt-servo ears improve the original cantilever arrangement. This is an engineering prototype, not a verified load-rated product. No physical durability test or finite-element analysis has been performed.

## What the added bearing changes

With a 150 g camera and an approximately 35 mm lateral offset, the original one-sided support carries a bending moment of `0.150 × 9.81 × 0.035 = 0.052 N·m`. A support at each side lets the assembly share vertical loads and reduces bending at the servo output. Load sharing depends on alignment and actual centre of gravity; it is not guaranteed to be exactly equal. The opposite bearing does not increase the servo's available drive torque or protect its plastic gears from a jam.

The 625 bearing dimensions are 5 × 16 × 5 mm ([SKF catalogue](https://cdn.skfmediahub.skf.com/api/public/0901d196802809de/pdf_preview_medium/0901d196802809de_pdf_preview_medium.pdf)). The current owner-requested version uses a printed shoulder axle (4.85 mm smooth journal, 12 mm under-head length), a paired printed 2.7 mm captive nut, a 2.5 mm outer washer and a 1.4 mm inner spacer. Washers/spacer must contact the inner race only. Incorrect stack length can preload or bind the bearing. The bearing shoulder has clearance around the spacer; inspect the printed fit and the camera-side axle tip before use.

For an ideal rectangular section with the same width, changing thickness from 4 to 6 mm increases bending section modulus by `(6/4)^2 = 2.25` and elastic bending stiffness by `(6/4)^3 = 3.375`. These ratios describe a simplified section, not the strength of the printed assembly. Rounded arm-foot transitions reduce abrupt load transfer; layer adhesion, screw holes, mounting ears and print defects still govern failure.

## Torque and stability

Camera gravity torque is `mass_kg × perpendicular_offset_cm` in kgf·cm: 150 g at 1 cm is 0.15 kgf·cm; at 3 cm it is 0.45 kgf·cm, before cradle weight, acceleration and cable drag. [TowerPro lists 1.8 kgf·cm at 4.8 V as stall torque](https://towerpro.com.tw/product/sg90-7/), which is not a continuous operating rating. Balance the assembled cradle near the tilt axis and use slow movements. For heavy cameras, frequent tracking, heat, jitter or backlash, redesign around stronger servos and independent bearings on both sides.

The compact base footprint is 100 × 82 mm. For an illustrative measured total mass of 0.4 kg, a CG margin of 35 mm, and a cable pull applied 127 mm above the desk, the static tipping force is only `0.4 × 9.81 × 0.035 / 0.127 = 1.08 N`. These are illustrative assumptions, not measured device properties. The reduced footprint decreases tipping resistance. Measure actual mass, feet placement and CG, secure the device using the captive 1/4-20 socket, and leave relaxed cable loops. Rubber feet reduce sliding but do not prevent tipping; this design is not a monitor clamp.

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

The compact 100 × 82 × 38 mm enclosure replaces the broad base. Matching side shells have a shallow 7 mm lower spine and full depth only around the servo-sized pivot. The 92 mm pan cowl hides the spindle. The passive shell protects the 625 bearing, axle and internal arm; it is not itself the primary tilt bearing support. Integral standoffs retain short M2 × 8 mm cover screws. Less hollow volume does not establish strength or stability: repeat loaded movement, cable pull, torque, heat and RF checks with the actual assembly.

## Printed axle qualification

The printed axle and nut are a prototype alternative to the earlier metal joint. Geometry and paired thread clearance are checked, but this does not establish strength or a safe working load. Layer separation, thread stripping, support damage and creep can loosen or fracture the joint. Print the axle horizontally with supports and use PETG or suitable nylon, then trial-fit without forcing the threads. Retain gently rather than torque-clamping the bearing. Check unloaded rotation and camera clearance, then test with a supported dummy load before attaching the camera. Use a safety tether and inspect for cracking or increasing play. No fatigue life, temperature margin or loaded durability is claimed.
