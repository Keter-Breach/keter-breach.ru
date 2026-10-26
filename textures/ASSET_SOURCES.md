# PROJECT: KETER — texture sources

This file tracks candidate external PBR materials for future integration. The game currently uses lightweight procedural materials as a fallback; do not remove those fallbacks when adding image textures.

## Selected candidates

- **Worn concrete wall:** [Poly Haven — Concrete Wall 004](https://polyhaven.com/a/concrete_wall_004). CC0. Start with 1K or 2K maps; avoid the 8K package for the browser/Windows build.
- **Damaged concrete:** [Poly Haven — Concrete Wall 006](https://polyhaven.com/a/concrete_wall_006). CC0. Good alternative for the containment and technical corridors.
- **Rusty metal:** [ambientCG — Rust 001](https://ambientcg.com/). CC0. Choose a 1K/2K download and use Base Color, Normal and Roughness maps where supported.
- **Industrial floor:** [ambientCG](https://ambientcg.com/). Search for a worn concrete or factory-floor material; prefer 1K/2K maps.

## License and integration notes

- These candidate libraries publish assets under CC0; verify the specific asset page and selected download before committing files.
- Prefer WebP/JPEG for color maps where suitable, and keep each material set small to limit initial load time and installer size.
- Use Three.js `TextureLoader`, `RepeatWrapping`, and correct color-space settings for color maps. Normal/roughness maps must not be treated as color maps.
- Keep the existing procedural `TEX` materials as fallback if an image fails to load or the game runs offline.
- Do not hotlink remote texture URLs at runtime. Download assets into `textures/` and package them with the game so the offline Windows build remains self-contained.
