# View-pair audit — 2026-10-16

Coverage: all 36 distinct pairs of Symbolic fraction, Rectangle dissection, H²,
Modular surface, Punctured modular torus, Poincare Disk, Marked torus edge flips,
Marked rational tangle, and CF braid / 4-plat. Each pair was exercised in both
pane orders at desktop and mobile viewport sizes (144 configurations), using
5/13 for coefficient selection, editing, undo, and playback, and the golden
ratio for approximation labeling. Screenshots of every pair were inspected.
These checks used Chromium, including mobile emulation; they do not establish
Safari compatibility or exhaust all inputs and display options.

## Fixed in this change

H² and disk Farey edges now share base styles, current-triangle outlines, and
selected-coefficient crossing colors. Disk edges are deduplicated before
rendering. Both retain the three edge-class colors beside edge flips; highlights
respect the Farey layer toggle. Regression checks cover both pane orders on
desktop and mobile.

## Remaining findings

1. **Coefficient clicks have different navigation effects.** With Symbolic + H²,
   selecting a₂ highlights that run but leaves time at zero. With Symbolic + edge
   flips, the same click seeks its first flip. Rectangle + H² also seeks. Pressing
   Play after inspection can therefore jump the highlight back to a₀ in some
   pairings. A common coefficient-seek rule would make this predictable.
2. **Switching views can change selection.** Start with Symbolic + Rectangle at
   5/13, select a₂, then replace Symbolic with H². Selection resets to a₀ because
   the linked clock initializes from time zero. The number is preserved.
3. **Linked rectangle edits/undo lose the selected coefficient.** At 5/13 with
   Rectangle + any hyperbolic view or edge flips, select a₂ and edit it from 1
   to 2. The value correctly becomes 8/19, but selection resets to a₀. Undo
   correctly restores 5/13 and time, but selects a₁ at the shared interval
   boundary instead of a₂. Reproduced in both pane orders after waiting for
   rendering to settle. Non-linked rectangle pairs preserve a₂.
4. **Playback pacing depends on the selected process/pair.** Linked rectangle
   and ordinary hyperbolic playback use constant hyperbolic speed. Edge-flip
   playback still gives each crossing interval 1.4 seconds at 1×, so its companion
   hyperbolic point changes speed. Rectangle + Symbolic/Tangle/Braid uses one
   stage per 1.4 seconds and a stage-index slider. These are different valid
   processes, but changing the companion view changes the slider's meaning.
5. **Tangle closure display depends on the companion.** The tangle is open
   normally, but acquires dashed numerator-closure arcs beside the braid. The
   caption explains this deliberate comparison; an explicit closure control
   would make the display change less surprising.

No page errors, document-width overflow, duplicate element IDs, or duplicate
pane-level playback controls appeared in this scan. All checked edits and undo
restored the exact rational value; the confirmed undo issue concerns selection.
Irrational tangle/braid diagrams retain the shared convergent selector and
approximation labeling. Distinct mathematical clocks and the distinction
between the six-sheet modular cover and marked edge-flip torus remain necessary.

## Graphical color correspondence

Reviewed the palette assignments and drawing layers for all nine views, together
with the pair screenshots and additional 3D surface/tangle comparisons.

| Graphical meaning                         | Views compared                                                                                                                           | Result                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Coefficient index                         | Symbolic, rectangle groups, selected trajectory intervals in all four hyperbolic views, flip-path runs, tangle halo, braid twist regions | Same `stageColor(index)` mapping. Opacity/width differ to indicate selection.                                                           |
| Fixed Farey triangle                      | H², disk, central lattice faces                                                                                                          | Same exact triangle-to-color mapping. Lattice uses slightly stronger fill, intentionally.                                               |
| Three current edge classes                | Lattice, disk, H² beside edge flips                                                                                                      | Same three colors and matching slope labels. A colored Farey side denotes the slope replaced by crossing it, not either endpoint slope. |
| Modular T/S edges                         | H², disk, modular surface, six-sheet torus; flat and 3D                                                                                  | Shared blue T / orange S palette. Active-domain outlines are neutral except during seam crossings.                                      |
| Six cover sheets                          | H²/disk beside torus, flat/3D torus                                                                                                      | Same sheet-to-base-color mapping, including lift; opacity and 3D lighting differ.                                                       |
| Ford circles and rational labels          | H², disk                                                                                                                                 | Same finite-circle fill, outline, and label colors. Infinity horocycle outline opacity differs slightly.                                |
| Selected rational / convergent inspection | H², disk, slope inspection                                                                                                               | Shared inspection color.                                                                                                                |

Remaining visual issues, in priority order:

1. **Cover-sheet colors imply a false coefficient correspondence.**
   `torusDomainColor(j)` reuses `stageColor(j mod 6)`. Thus sheet 2 and a₂ are
   identically blue without being mathematically equivalent. This is especially
   misleading beside rectangle groups, symbolic coefficients, or braid boxes;
   it also weakens the selected trajectory accent against similarly colored
   sheets. Give cover sheets a separate palette and retain coefficient colors
   only for coefficient-related accents.
2. **Tangle versus braid uses strand color differently.** Tangle strands are
   teal/brown by component; braid segments change color by twist coefficient.
   The selected tangle halo correctly matches the braid region, but the base
   strand colors cannot be read across panels. Prefer neutral base strands and
   consistent coefficient-colored region accents, or a clearly named optional
   component-color mode. Do not imply an unverified pointwise strand mapping.
3. **Endpoint, moving-point, and trail colors drift.** Boundary α is orange in
   H² but green in the disk. The moving point is `#c57548` in both plane models,
   `#c7744d` on the modular surface, and `#bd4d31` on the cover. Trails similarly
   range from orange to dark red, including a flat/3D difference on the modular
   surface. Use shared semantic colors; retain opacity changes for occlusion.
4. **Fill visibility/strength changes between plane models.** The disk colors
   Farey triangles whenever Farey edges are enabled (unless beside the cover).
   H² colors them only beside disk/edge flips or with its triangulation display.
   Thus replacing H² with disk alongside Symbolic/Rectangle/Tangle/Braid adds a
   new fill scheme. Cover-domain fill opacity is .26 in H² and .22 in disk.
   Align the layer behavior and base opacity; keep 3D lighting distinct.
5. **Several independent color systems can overlap without explanation.**
   Farey triangle fills reuse hues from the three edge-class palette, while
   dual-path segments use the coefficient palette. These are intentionally
   different mathematical assignments, not broken mappings. A small contextual
   key (faces = triangle, edges = slope class, path = coefficient) would help
   more than adding explanatory paragraphs or more colors.

The ordinary Farey-edge mismatch is addressed by this commit. The visual issues
listed above are findings/recommendations, not additional implemented changes.
