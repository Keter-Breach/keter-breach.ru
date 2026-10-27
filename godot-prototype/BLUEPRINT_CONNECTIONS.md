# Keter Breach — blueprint connections

This document records the approximate world-space layout used by `scripts/facility_layout.gd`.
Coordinates are Godot world coordinates (X = left/right, Z = progress through the facility).
The room rectangles are a working blockout; final wall thickness and prop placement should be checked in Godot.

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
| Reactor / technical sector | X -37..-13, Z 49..75 | Doorway chain through X=-16 and X=-13 around Z 56..63 |
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
