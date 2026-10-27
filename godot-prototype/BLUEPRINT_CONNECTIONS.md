# Keter Breach — blueprint connections

This is the layout reference for `scripts/facility_layout.gd`. Coordinates are Godot world coordinates: X = left/right, Z = progress through the facility, Y = height. Bounds below describe room interiors unless a wall line is explicitly listed. Architectural edits should update this document and the script together.

## Geometry rules

- Standard concrete walls are 0.5 units thick and 3.2 units high; their centreline is the listed X or Z coordinate.
- Door gaps are measured along the wall centreline. `_wall_line()` adds a 0.65-unit lintel above each gap, so check both the opening and its head clearance.
- Main spine interior is approximately X=-5..5 from Z=2..24, then X=-5..5 from Z=24..44, X=-16..16 from Z=44..60, and X=-4..4 from Z=60..80 and Z=105..130. The Z=44 boundary is one continuous wall with a central opening; it must not be generated twice.
- A room connection is only valid when the wall gap, doorway/door prop, and traversable floor all share the same coordinates. A wall gap alone does not guarantee a passable route.

## Room blocks

| Zone | Approximate bounds (X, Z) | Connection |
|---|---|---|
| Cargo lift / start | X -14..-4, Z -10..2 | Opens to the main spine |
| Administration | X -15..-5, Z 4..16 | Door through east wall at Z 8..12; L1 card |
| Archive | X -37..-13, Z 6..30 | Connects to west service wing through X=-13, Z 24..29 |
| West service wing | X -17..-5, Z 24..44 | Main spine doors at Z 25..28, 31..34, 38..41 |
| Laboratory | X 5..15, Z 27..39 | Main spine door at Z 31..35 |
| Medical block | X 15..37, Z 25..51 | Connects to lab through X=15, Z 30..36 |
| Containment | X -16..16, Z 44..60 | Main route through Z=44; side exits toward reactor and observation |
| Reactor / technical sector | X -37..-16, Z 49..75 | Doorway through the shared X=-16 wall around Z 55..63 |
| Security post | X -14..-4, Z 63..77 | Side entrance from the spine at X=-4, Z 66..70 |
| Observation gallery | X 13..37, Z 58..82 | Connects from containment at X=16, Z 55..60 |
| Observation booth | X 16..26, Z 65..75 | Internal doorway through X=16, Z 68..72 |
| Personnel room | X -35..-15, Z 79..97 | Door to comms through X=-15, Z 86..92 |
| Channel 7 comms | X -15..15, Z 83..105 | Connects to the Mirror corridor at Z=105 |
| Mirror corridor | X -4..4, Z 105..130 | End of current playable route |

## Intended traversal

1. Start in the lift and enter the spine.
2. Search administration for the L1 card.
3. Use the west service wing to reach the archive, workshop, and isolation rooms; the rooms have internal door gaps.
4. Follow the spine through the laboratory/medical junction to containment.
5. Branch west to the reactor and east to the observation gallery.
6. Return to the upper route, reach personnel and Channel 7, then pass through the Z=105 opening into the Mirror corridor.

## Implementation notes

- The minimap is drawn from these same world-coordinate bounds and the player marker uses the player's actual world position.
- Doors, props, and collision need a Godot runtime pass after each architectural change; a successful web deployment alone does not prove the 3D level is playable.


## Critical wall centre-lines and openings

| Boundary | Centre-line | Opening(s) | Notes |
|---|---|---|---|
| Lift / spine | Z=-10, X=-4..4 | none | Rear lift wall |
| Lift front | X=-4, Z=-10..2 | Z=-5..-1 | Lift exit |
| Administration west/east | X=-5 and X=5, Z=2..24 | X=-5: Z=8..12; X=5: Z=8..12 | Openings align to the main spine |
| Main spine at Z=24 | Z=24, X=-5..5 | X=-1..1 | Keep centre passage clear |
| Service wing west/east | X=-5 and X=5, Z=24..44 | west: Z=25..28, 31..34, 38..41; east: Z=31..35 | Three west-wing entrances; one lab entrance |
| Containment entrance | Z=44, X=-17..16 | X=-1.5..1.5 | Single wall run; do not add a second overlapping wall |
| Reactor entrance | X=-16, Z=44..75 | Z=55..63 | Side branch west |
| Observation entrance | X=16, Z=44..60 | Z=55..60 | Side branch east |
| Security post | X=-4, Z=60..80 | Z=66..70 | West-side entry |
| Evacuation boundary | Z=80, X=-4..4 | X=-1..1 | Opens toward comms route |
| Channel 7 / Mirror | Z=105, X=-15..15 | X=-4..4 | Narrow passage into Mirror corridor |

## Placement audit notes

- The Z=44 containment wall previously overlapped the west service wing's rear wall between X=-17 and X=-5. The layout script now creates one continuous wall for that boundary to avoid duplicate colliders and coplanar geometry.
- Large props should stay inside their room bounds and out of the walking route. In particular, keep server racks and their LEDs grouped together, sample tanks inside the lab, medical beds inside the medical block, and interaction triggers close to the corresponding visible prop.
- The minimap, wall openings, doors, props, and interaction triggers should be checked together in a Godot runtime pass. CI parsing alone cannot confirm collision clearance or visual alignment.
