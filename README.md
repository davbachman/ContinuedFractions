# Continued Fractions Atlas

An interactive mathematical instrument connecting continued fractions, the Farey tessellation, Ford circles, the modular orbifold, rectangle dissection, and marked rational tangles. Choose an exact number and compare two representations, with an explicit explanation of their correspondence.

**[Open the Atlas](https://davbachman.github.io/ContinuedFractions/)** · [Mathematical conventions](docs/MATHEMATICS.md) · [Original design](docs/DESIGN.txt)

## Compare two representations

The default workspace shows **Symbolic continued fraction** beside **Rectangle dissection**. Choose any representation independently from the left and right selectors: symbolic CF, matrix products, rectangle, H²/Farey/Ford, modular surface, punctured modular torus, Farey triangles, marked torus flips, rational tangle, or marked torus/pillowcase. The same representation can appear twice. **Swap sides** moves each pane with its current camera and display settings.

- Use **Start with a connection** for curated comparisons. The connection caption states whether the panes share a trajectory, coefficient, marked construction, or only the target number. It does not invent a common clock or identify the distinct torus markings.
- The compact shared coefficient strip selects and edits terms in every pairing. Selecting a term highlights a rectangle group, Farey run, or canonical tangle twist region where defined. Symbolic views offer nested fractions, coefficient lists, exact editing, convergents, approximation error, prefix cylinders, and optional alternate endings.
- Hyperbolic panes share one trajectory clock and expose their own play, reverse, scrub, event list, speed, and depth controls. Cameras and H² overlay settings are independent. When paired with a coefficient or prefix view, quotient surfaces highlight the selected coefficient's displayed Farey-run interval, including its future portion; this inspection overlay does not seek the moving point. a₀ and zero-length runs are described explicitly.
- Rectangle playback normally steps Euclidean groups and leaves hyperbolic time unchanged. Pair it with Farey triangles, marked edge flips, H², the modular surface, or the punctured modular torus and enable **Synchronize by coefficient** to use a shared run clock. Play/Pause and Previous/Next linked stage work from either pane; the shared progress slider scrubs forward or backward within a run, and **Reverse linked playback** retraces the stages. Starting one process pauses the other so competing clocks cannot change the shared selection simultaneously.
- Canonical tangle twist regions map to coefficients with reversed construction order and alternating signs. Custom signed words keep their operations and link only by rational value. Irrational inputs display a labeled, selected convergent; editing makes the result rational.
- Manual triangulation flips remain independent of the target number. Pair the editor with H² to select neighboring Farey triangles in either pane, or use **Follow target**. The marked triangulation and branched-cover slope views remain distinct from the six-sheet modular torus.
- On desktop the two equal panes scroll independently. On mobile they stack and use the page scroll. Tab to a pane and use Space/Left/Right for its trajectory or dissection controls; focus a 3D surface for rotation keys. Standard controls remain keyboard and touch accessible.
- The exact number, signed expression, and triangulation history still use the existing scene and undo system. View choices and cover lifts are retained locally and included in shared-link query parameters. Camera angles, zoom, and other local display preferences are session settings; changing representation resets its renderer. Scene JSON retains mathematical state rather than pane preferences.

**Full atlas** opens the previous layout without changing the exact state. **Compare two views** returns to the new workspace. The earlier layout is also available at `?layout=atlas`; its regression tests continue to run alongside the new workspace tests. The detailed controls below describe both renderers and the full atlas layout.

### Linked rectangle and Farey-run playback

The optional link groups the existing exact Farey itinerary by coefficient. Each rectangle stage spans all its generated flips, from the preceding crossing to the last crossing in its group. The H² point moves continuously between those times; quotient and cover views use exactly the same point and chart transitions. Crossings receive equal animation beats, so this is a reparameterized trajectory, not constant hyperbolic speed. Reduced motion steps directly between crossings. A run lasts 1.8–6 seconds at 1× speed; very large groups may advance several flips per rendered frame.

- a₀ sets the translated bracket. For 0 < α < 1 it is an orientation change with no squares; the separate initial Farey entry is explicitly labeled and is not counted as a square.
- Initial and rational terminal offsets determine the L/R counts. A zero-crossing run, such as the final stage of 1/2, holds the hyperbolic point while showing its rectangle group. An integer ray lies on a Farey edge and generates no automatic flips.
- Rational playback stops at the last group and a triangle incident to the target cusp; it never claims to reach the ideal endpoint in finite time. Irrational or incomplete rational runs stop at the displayed time/crossing limit with an incomplete-run label. Extend depth and relink to continue where possible. The 512-crossing cap includes the initial entry.
- Enabling the link switches the marked triangulation to Follow target as one undoable operation. Playback frames do not fill the undo history. Selecting a coefficient while linked seeks its stage. Editing, undo, manual exploration, or switching representations pauses and releases the link; re-enable it when ready. Cameras and the exact target remain independent of playback. The link is a temporary workspace setting, not serialized scene data.

## Matrix products

The matrix view is available in either comparison pane. Try **Read the matrix product** in the preset selector. Old approximation-error links and saved layouts now open matrix products while preserving the shared number.

- **Matrix products** shows each factor `A(a) = [[a,1],[1,0]]`, multiplication on the right, and the selected exact product with columns `(pₙ,qₙ)` and `(pₙ₋₁,qₙ₋₁)`. Select a factor to inspect its prefix. Determinants alternate between −1 and +1; these are GL(2,ℤ) encodings, not all PSL(2,ℤ) transformations of H². Long matrix equations scroll horizontally.

Rectangle, trajectory, and Follow-target flip playback already advance this view through the shared coefficient selection. The active matrix factor scrolls into view and its exact multiplication is emphasized. Canonical tangle diagrams emphasize the matching region’s strands in both 2D and 3D, label its actual signed twist count, and explicitly show zero twists. Custom signed constructions retain independent regions. Successive irrational tangle approximations are discrete diagrams, not an animated isotopy. All presentation transitions respect reduced-motion preferences.

**Previous/Next prefix**, the prefix slider, and the shared coefficient strip synchronize selection. Focus a prefix pane and use Left/Right to step; Enter or Space activates a focused matrix factor. Selection leaves the target and hyperbolic clock unchanged. **Use convergent as target** explicitly switches to that exact rational using the existing undo history, and selects its canonical final term (a trailing 1 may shorten the expansion). Undo/redo restores the exact number; coefficient selection is an inspection setting, not part of scene history. Edits through the shared strip recompute all views.

Periodic expansions extend on demand to the existing **96-prefix** display budget and remain labeled infinite. Rational expansions retain the **128-term** input budget. Matrix calculations use BigInt. Zero, integers, and negative finite numbers are supported. Infinity keeps its exact shared value and shows an unavailable explanation.

## Explore

Start at **5/13 = [0; 2, 1, 1, 2]**, or select 7/19, 355/113, φ, or √2. Enter a rational, signed integer, exact decimal, or regular continued-fraction list. A finite prefix can terminate or explicitly continue with an infinite tail of ones.

- **Play**, reverse, scrub, or step between Farey crossings and coefficient runs. Time measures hyperbolic distance, with `z(t) = α + 2i exp(−t)`.
- **Auto zoom** is on by default: the view magnifies as `exp(0.92t)`, so the point keeps descending slowly in the viewport, with remaining screen height proportional to `exp(−0.08t)`. Turn it off for a fixed camera. Seeking and reverse playback retrace the same camera motion.
- **Two-finger vertical drag** zooms the hyperbolic view: up zooms in, down zooms out. Both touchscreen gestures and trackpad scrolling work over the canvas; scrolling elsewhere still moves the page. The gesture changes only the camera and combines with automatic zoom.
- Switch Farey edges, Ford circles, modular domains, labels, convergents, and the dual-tree path independently. Modular-domain boundaries refine with the visible Farey triangles, revealing smaller copies as you zoom in. Blue T-paired edges and purple S-paired edges match the folded and 3D quotient views. The 3D orbifold and modular torus have filled, shaded surfaces at 78% opacity; rear curves show through faintly.
- Switch the continued-fraction panel between **Coefficients** and **Stacked fraction** to see the list or the nested fraction with horizontal fraction bars. Both views support coefficient selection and editing; long expressions scroll within the panel, and periodic expansions end with an ellipsis. Use the arrow keys, Home, or End when a tab has focus.
- Select a coefficient to inspect its convergent, error, determinant, and actual crossing run. Edit it to recompute the scene; undo/redo restores number edits.
- Inspect a Ford circle without changing the endpoint. Use **Use this endpoint** to apply it. Drag the α handle on the real axis to update the endpoint and every view immediately. Playback pauses during the drag, and the entire gesture is one undoable edit. Simple rationals with denominator at most 64 snap within 6 screen pixels; at deeper zoom, other positions use an explicitly rounded decimal rational.
- Compare the folded modular domain with the rotatable **Schematic 3D** quotient. Drag left/right directly on any 3D view (mouse, pen, or touch) to turn it, and up/down to roll it forward/back. Focus the view and use Left/Right to turn, Up/Down to roll, Home to reset both axes, or Escape to cancel a drag. Touch drags over a 3D model rotate it; drag outside the model to scroll the page. Paired seams represent the same points; the curve never draws a false chord across a seam.
- **Download**, **Load**, or **Share scene**. Exact integers are serialized as decimal strings in versioned JSON (version 4 includes signed tangles and marked-triangulation flip history; versions 1–3 still import). A scene is also saved in local browser storage.
- On mobile, switch visual panels without changing the underlying state. Essential actions have labeled controls and touch support.

## Rectangle dissection

Choose **Rectangle dissection** above the main viewer. The same exact number, coefficient selection, editor, and undo/redo history are shared with the hyperbolic view. The companion panel explains the selected Euclidean division and gives the actual working and remaining dimensions. On mobile, use **02 Euclidean division** to open that explanation.

- Start with width **α** and height **1**. A stage removes the maximum number of squares of the shorter side. For **13/5**, the counts are **2, 1, 1, 2**. For **5/13**, the canonical coefficients are **0, 2, 1, 1, 2**: stage a₀ changes orientation without removing squares or replacing α by its reciprocal.
- **Play/Pause**, restart, or step through groups. Click a coefficient, a square group, or an overview group to select its stage. Removed groups remain colored for inspection, and coefficient colors match the groups. Rectangle playback advances by Euclidean stages, independently of hyperbolic time. Switching back restores the H² timeline and highlights the selected coefficient's Farey run where it is inside the current display window.
- **Full dissection** keeps the original rectangle visible. **Follow remainder** fits the working remainder from the preceding stage and smoothly rotates its cutting direction horizontally. The current square group and its leftover rectangle stay visible; the overview always shows their original position. Reduced-motion preferences disable transitions.
- Drag the right edge of the **original rectangle overview** to change α. This updates both views immediately and creates one undoable edit. It uses the H² viewer's denominator-64 rational snapping within 6 pixels, otherwise an explicitly rounded decimal. The displayed value is the actual shared value. The focused handle supports left/right arrows (Shift for larger steps) and Escape to cancel an active drag. Dragging is limited to **0.0001 ≤ α ≤ 10,000**; smaller positive numbers can still be entered exactly.
- Rational sides and remainders are exact; a zero remainder ends the process. Periodic numbers, including φ and √2, use exact symbolic dimensions in α and generate more stages on demand. They never acquire a false zero remainder at a display cutoff. Up to **96 periodic stages** are available. Full rational expansions use the existing 128-term input budget.
- Detail is bounded: at most 24 individual squares in the selected group and 4 in earlier groups; larger or subpixel groups become aggregate rectangles with exact counts in the explanation. Extreme aspect ratios may be thinner than a screen pixel. Screen coordinates use an exact 128-term convergent before conversion to floating point; it never decides counts or termination. Very large camera jumps skip interpolation.
- Zero and negative inputs show an unavailable state without changing the number. Infinity is accepted as the exact tangle value 1/0; H² and rectangle drawing are unavailable for it, with clear explanations and the shared number preserved. The canonical expansion is used for square groups; the alternate rational ending remains available in H² mode.

The viewer choice and rectangle camera are session UI settings; scene files retain the exact number, signed tangle expression, and H² playback settings.

Keyboard: **Space** plays/pauses; **← / →** step rectangle stages in rectangle mode or Farey crossings in H² mode; **Shift + ← / →** step coefficient runs; **Ctrl/Cmd + Z** undoes a number edit. Shortcuts do not intercept typing or native form controls. Reduced-motion preferences suppress decorative transitions; playback only begins by explicit action.

## Punctured modular torus

In the quotient panel choose **Punctured torus**, then **Flat hexagon** or **Torus 3D**. The six colored regions are Tʲ(F), j=0,…,5, for the commutator subgroup of PSL(2,ℤ). This is not Γ(2). Opposite hexagon edges identify, the center is removed, and the cusp has width six.

The existing H² Play, reverse, and scrub controls move the lifted point and trail. **Cover lift** chooses one of six lifts; it does not edit α. Drag the 3D view to rotate it; toggle domain edges, labels, and trail. Trails split at coordinate-chart changes and their seam endpoints agree on the surface. The mesh is a schematic topological atlas with a small cusp cutaway and a depth-tested trail visible through its translucent surface, not an isometric embedding. No homology slope is assigned to the lifted hyperbolic ray.

## Rational tangles and the pillowcase

The **Marked rational tangle** panel shares the exact number and undo history with the continued fraction, H², and rectangle views.

- Start with **Zero tangle** (horizontal arcs) or **Infinity tangle** (vertical arcs). Endpoints stay marked NW, NE, SW, SE. **Add +1 / −1 endpoint twist** acts at the right pair and changes x to x±1. **Quarter-turn ↺ / ↻** rotates the actual diagram and changes x to −1/x; **Mirror crossings** sends x to −x.
- Select a signed twist region in the expression, or click its diagram crossings, then edit its count. The chronological expression remains separate from the regular continued fraction, including cancelling twists and rotations. **Remove last operation** reverses the last recorded construction step. Undo/redo restores the expression and shared number together. Editing the continued fraction or endpoint generates a new canonical diagram expression.
- **Lifted tangle 3D** draws each twist region as two strands winding around a shared axis: each signed half-twist adds a half-turn, and its sign controls the helix handedness. Smooth transitions join different twist axes. Drag to rotate the model, or click a strand to select its twist region. The primary 2D view shows gaps at underpasses. Zoom and scroll to inspect a long construction. Regions above 24 twists, or beyond the total 160-crossing detail budget, use boxes with exact signed counts and connectivity. Detailed 3D requires at most 180 edges and no aggregate boxes. Operation words are capped at 512, with up to 1,024 digits per twist count and a 100 KB operation budget, within the existing number/display validation limits.
- For φ, √2, or another exact periodic input, explicitly choose a **Tangle convergent**. The panel labels it as an approximation. Editing this tangle or its marked slope switches the shared value to the resulting rational; undo restores the exact irrational.
- Choose **Branched-cover torus / pillowcase** to see the two parallel meridians and their common separating curve on the four-marked sphere. This is a separate construction from the six-sheet hyperbolic cover. Edit **Marked slope**, apply **Dehn twist ±1**, or **Lift quarter-turn**; the verified marking sends these to the corresponding tangle operations. The torus rotates independently. Curves are drawn when |p|+q≤512; larger slopes retain exact controls and display a limit notice.

View choices, diagram zoom, and camera angles are session UI settings. Scene JSON and shared links preserve the exact number and signed operation word, including zero and infinity. No external diagrams or mesh assets are required.

When **Punctured torus** is selected, the H² viewer lightly fills modular-domain copies with the matching six sheet colors in both the flat hexagon and 3D surface modes. Changing **Cover lift** updates the plane colors to match the selected lift; switching back to **Modular orbifold** removes these fills. The **Modular domains** checkbox independently controls domain edges.

## Farey triangles and marked torus edge flips

The **Marked torus · edge flips** panel starts with slopes **0, ∞, 1** in the fixed meridian–longitude basis. A slope p/q represents the primitive vector (q,p), up to overall sign. This editor uses the Farey combinatorial correspondence; it does not assign a homology slope to the moving ray on the six-sheet hyperbolic cover.

- Start with **Continued fractions → flips** to pair **Farey triangles · flip path** with **Marked torus · edge flips** in Follow target mode. Both panes show one shared exact triangulation and one playback position. Play/Pause and Previous/Next work from either pane; shared undo/redo also restores flips.
- A square edge of slope p/q corresponds to a Farey vertex, its three edge slopes form a Farey triangle, and flipping an edge crosses the opposite Farey side. Colors match the three edge classes across the views. The target α is labeled separately; manual flips never replace it.
- In **Manual flips**, click an edge, a colored slope button, or a neighboring Farey triangle. All three classes are flippable, including boundary copies. In the marked-square view, **Explain this flip** temporarily replaces the diagram with the unfolded quadrilateral; **Back to diagram** restores it. The tiled grid and affine/fixed-basis patch controls live inside this inspector.
- **Follow target** reuses the vertical ray’s Farey itinerary. The initial crossing is separate from the L/R runs; a₀ translates the starting bracket, a₁ has the initial −1 offset, and a rational’s last run has another −1 offset (both apply when there is only one fractional coefficient). Zero-length runs create no fake flips. The caption shows the selected coefficient, direction, completed flips, and full run length. Selecting a coefficient highlights its colored path segments without seeking; **Go to selected run** explicitly moves the shared position.
- The Farey diagram labels α on the boundary (using an exact convergent for its display position when irrational). Completed path segments are solid; generated future segments are dashed. Follow target centers the current triangle by default. Camera controls under **Edge actions, history & display options** preserve the marking and exact slopes.
- H² Play/Pause and reverse playback also drive the follow-target flip position at the recorded crossing times. Flip steps seek those times in H² and its quotient/cover views; independent flip playback advances one crossing per beat. Rectangle stages have a separate clock unless **Synchronize by coefficient** is enabled in a compatible comparison.
- Rational following stops at a triangle incident to the target cusp, not at finite-time arrival at the ideal endpoint. Integer rays lie on a Farey edge and use the right-hand triangle without inventing crossings. Irrational itineraries extend on demand with explicit display limits.
- **Edge actions, history & display options** also contains individual edge inspection, **Use this slope as target**, puncture display, H² overlay, reset, undo/redo, and the complete recorded path. The full atlas uses **Marked square / Farey triangles** tabs instead of stacking diagrams. The marked triangulation is distinct from the six-sheet modular torus cover.

Rendering is bounded without changing the mathematical state: an edge with |p|+q>160 is hidden with a notice, but its exact label and flip control remain usable. Face shading uses at most 180 candidate tiles per triangle; the optional unit grid is hidden when the patch's coordinate extent exceeds 12. The flip history holds up to 512 steps and shared undo retains the existing 50-edit budget. Very deep Farey triangles approach the display boundary; use **Center Farey triangle** to inspect them.

## Run locally

Requires **Node.js 22.12+** (Node 24 is used in CI) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Production commands:

```sh
npm test             # Exact mathematics, seams, state, and atlas identifications
npm run build        # TypeScript checking and production assets in dist/
npm run preview      # Serve the production build
npm run benchmark    # Declared mathematical fixture benchmarks
```

Browser checks use Playwright and an installed Chromium:

```sh
# Linux with Chromium already installed:
npm run test:browser

# Or use the executable path of your Chromium installation:
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

The browser suite covers desktop and mobile interaction, keyboard navigation, reduced motion, persistence, import/export, and screenshots. Screenshots are written to `test-results/`, which is not committed. CI runs mathematical tests and the production build; browser tests require a local Chromium installation.

## Deploy to GitHub Pages

The repository's `main` branch triggers [the Pages workflow](.github/workflows/pages.yml). It installs locked dependencies, tests the exact kernel, builds, and deploys `dist/` with the official GitHub Pages actions. Vite uses relative asset paths so the project works at `/ContinuedFractions/` and on other static hosts.

The workflow requests Pages enablement. If an organization's policy or repository permissions prevent automatic enablement, select **Settings → Pages → Build and deployment → Source: GitHub Actions**, then rerun the workflow. No application secrets, account, database, or backend are needed.

## Mathematical scope and limits

The exact kernel uses native BigInt. Rendering uses double precision with visible limits: `|α| ≤ 10,000`, hyperbolic time at most 24, at most 800 Farey crossing events, and adaptive pixel/depth budgets. The Ford timeline covers denominators ≤32 plus computed convergents. Periodic inputs extend the computed prefix on demand. Rational playback stops at a disclosed positive height, never at the ideal endpoint.

Farey crossings, coefficient runs, Ford contacts, and modular seams are **different events**. Initial and terminal run offsets are derived in [MATHEMATICS.md](docs/MATHEMATICS.md) and tested independently. The modular quotient has one cusp and cone points of orders 2 and 3; it is not a torus. Its folded view uses logarithmic screen height. The 3D display is a tested topological atlas, not an isometric embedding or a claim about Euclidean geodesics.

**Implemented:** the original number/Farey/Ford views, modular orbifold atlas, rectangle dissection, six-sheet commutator cover, marked rational tangles, and the separate branched-cover torus/pillowcase. Marked two-triangle torus flips are also implemented. Lens-space labels and tetrahedron layering are not included. The verified conventions, derivations, and source sections are in [TOPOLOGY.md](docs/TOPOLOGY.md).

## Project map

- `src/math/`: rational arithmetic, exact renderer-independent rectangle dissection, continued fractions, Farey traversal, Ford contacts, modular matrices/reduction, and a deterministic event timeline.
- `src/state.ts`: typed number/tangle/load commands, undo/redo, validation, and versioned persistence.
- `src/renderers/`: Canvas upper-half-plane, SVG rectangle dissection and folded quotient, six-sheet torus atlas, marked tangles, and pillowcase.
- `tests/`: exact fixtures, generated rational tests, seam/atlas tests, state checks, browser checks, and benchmarks.

## Credits and license

**David Bachman** conceived the project, supplied its mathematical design and requirements, and owns the repository. **OpenAI Codex** implemented the application, tests, documentation, and deployment configuration in collaboration with David. AI assistance is credited as development assistance; it is not an independent claim of mathematical authorship or copyright ownership.

Mathematical background is credited to Caroline Series, David Grabiner and Jeffrey Lagarias, and Ian Short, with references and verification notes in [MATHEMATICS.md](docs/MATHEMATICS.md). Boris Springborn and Louis Kauffman–Sofia Lambropoulou supply the cover and tangle references checked in [TOPOLOGY.md](docs/TOPOLOGY.md). No third-party diagrams were copied. Interface icons come from [Lucide](https://lucide.dev/) (ISC license); React, Vite, TypeScript, Vitest, and Playwright retain their respective upstream licenses.

This project's original source is distributed under the **[MIT License](LICENSE)**, copyright © 2026 David Bachman.
