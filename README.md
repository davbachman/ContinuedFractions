# Continued Fraction Explorer

An interactive mathematical instrument connecting continued fractions, the Farey tessellation, Ford circles, the modular orbifold, rectangle dissection, and marked rational tangles. Choose an exact number and compare two representations.

**[Open the Explorer](https://davbachman.github.io/ContinuedFractions/)** · [Mathematical conventions](docs/MATHEMATICS.md) · [Original design](docs/DESIGN.txt)

## Compare two representations

The default workspace shows **Symbolic continued fraction** beside **Rectangle dissection**. Choose any representation independently from the left and right selectors: symbolic CF, rectangle, H²/Farey/Ford, modular surface, punctured modular torus, Poincare Disk, marked torus flips, CF braid / 4-plat, or rational tangle. The same representation can appear twice.

- Edit **α** beside the shared coefficient strip and press Enter or the arrow to apply. Fractions, decimals, continued fractions, `phi`, and `sqrt2` use the same exact input parser and undo history. Undo/redo, scene files, and sharing are in the top-right header.
- The selected coefficient in the shared strip becomes a text field. Click a coefficient to select it, type a replacement, and press **Enter** to apply it. **Escape** cancels the draft; leaving the field also discards unsubmitted changes. Undo/redo restores coefficient edits across both panes. Selecting a term highlights a rectangle group, Farey run, or canonical tangle twist region where defined. Symbolic views offer nested fractions, coefficient lists, exact editing, convergents, approximation error, prefix cylinders, and optional alternate endings.
- A shared playback bar directly below α and its coefficients spans both panes, with Play/Pause and a labeled Reset button to the right of the slider. It contains play/pause, previous/next, restart, and the active clock’s slider. When the views offer different processes, choose **Hyperbolic trajectory**, **Edge flips**, or **Rectangle stages** from **Playback**. Switching processes pauses playback. Hyperbolic views share one trajectory clock; seeking its slider pauses flip playback. Reverse, speed, and event/depth settings live under **Playback options & events**. Cameras and H² overlay settings are independent. All hyperbolic views highlight the selected coefficient's displayed Farey-run interval, including its future portion; this inspection overlay does not seek the moving point. a₀ and zero-length runs are described explicitly.
- Rectangle playback automatically synchronizes by coefficient when paired with Poincare Disk, marked edge flips, H², the modular surface, or the punctured modular torus. There is no synchronization switch. Play/Pause and Previous/Next linked stage appear once in the shared bar; the shared progress slider spans the whole displayed sequence, with coefficient highlights changing along the way, and **Reverse linked playback** retraces the stages. Starting one process pauses the other so competing clocks cannot change the shared selection simultaneously.
- Canonical tangle twist regions map to coefficients with reversed construction order and alternating signs. Custom signed words keep their operations and link only by rational value. Irrational inputs display a labeled, selected convergent; editing makes the result rational.
- Every view follows the α chosen at the top. Poincare Disk and marked-torus flips automatically use its exact itinerary; changing α or a coefficient rebuilds their path. Previous/Next and playback navigate it without changing α. The marked triangulation remains distinct from the six-sheet modular torus.
- On desktop the two equal panes scroll independently. On mobile they stack and use the page scroll. Tab to either pane and use Space/Left/Right for the active shared playback process; focus a 3D surface for rotation keys. Standard controls remain keyboard and touch accessible.
- The exact number, signed expression, and triangulation history still use the existing scene and undo system. View choices and cover lifts are retained locally and included in shared-link query parameters. Camera angles, zoom, and other local display preferences are session settings; changing representation resets its renderer. Scene JSON retains mathematical state rather than pane preferences.

The comparison workspace has no layout-switch button. Older `?layout=atlas` links still offer **Compare two views** to return to the comparison workspace. The detailed controls below describe the shared renderers.

### Linked rectangle and Farey-run playback

Automatic synchronization groups the existing exact Farey itinerary by coefficient. Each rectangle stage uses the same coefficient presentation interval as ordinary hyperbolic playback: a₀ runs up to entry, a₁ begins at entry, and later coefficients begin at their first crossing. The H² point moves continuously through each interval; quotient and cover views use exactly the same point and chart transitions. Playback advances at constant hyperbolic speed: at 1×, hyperbolic time advances one unit per second, just as in ordinary trajectory playback. Coefficient boundaries occupy their actual, generally unequal positions on the slider. Selecting a coefficient jumps to its interval’s start. Reduced motion steps directly between crossings on the same clock. Large groups may advance several flips per rendered frame; rendering limits do not change the clock. Its right endpoint means the end of the displayed sequence; an irrational or depth-limited sequence remains mathematically incomplete.

- a₀ sets the translated bracket. For 0 < α < 1 it is an orientation change with no squares; the separate initial Farey entry is explicitly labeled and is not counted as a square.
- Initial and rational terminal offsets determine the L/R counts. A zero-crossing run, such as a₁ for 13/20 or the final stage of 1/2, moves the hyperbolic point inside the triangle while showing its rectangle group; it does not invent flips. An integer ray lies on a Farey edge and generates no automatic flips.
- Rational playback stops at the last group and a triangle incident to the target cusp; it never claims to reach the ideal endpoint in finite time. Irrational or incomplete rational runs stop at the displayed time/crossing limit with an incomplete-run label. Extend depth to continue where possible. The 512-crossing cap includes the initial entry.
- Compatible pairs always synchronize by coefficient. Selecting a coefficient seeks its stage and jumps the slider to that stage’s position in the sequence. Editing, undo, or switching representations pauses playback and keeps synchronization active. Playback frames and automatic synchronization do not add undo entries. Cameras and the exact target remain independent of playback.

## CF braid / 4-plat

Choose **CF braid · 4-plat** in either pane and **Symbolic continued fraction** in the other. This is the vertical three-active-strand presentation: boxes alternate between strands **1–2** and **2–3**, with the return strand **R** and curved plat caps visible. Choose **Marked rational tangle** in the other pane to compare the two diagrams.

- Read the colored boxes downward in coefficient order. Click or keyboard-select a box to highlight its coefficient in both panes. Click coefficients in the shared strip to inspect their boxes directly; rectangle and Farey playback also highlight the matching boxes.
- Edit a selected coefficient in the shared strip to change α; Undo restores the number and its other views. Canonicalization may change the final CF ending.
- A standard plat needs an odd number of boxes. For an even-length CF, the view shows the equivalent ending `[…, a−1, 1]`; both boxes retain the original coefficient’s color and selection. The zero box for α < 1 is explicit.
- Irrational α uses the explicitly selected **Finite diagram approximation**. Selecting a box changes its coefficient highlight without changing the approximation. Editing a coefficient changes the exact irrational CF and preserves its periodic tail; **Use approximation as α** explicitly switches to a rational.
- The diagram reports the closed knot/link fixture and component count. Huge twist counts become labeled bundles with exact connectivity. The presentation is 2D, with smooth strands and visible over/under gaps; it is distinct from the rotatable tangle diagram.

The [documented convention](docs/MATHEMATICS.md#continued-fraction-braid--four-plat) fixes signs, word order, caps, and zero/infinity cases. It follows [Kauffman–Lambropoulou, Figures 9–10](https://arxiv.org/pdf/math/0212011). Closed knots do not uniquely determine α; custom signed tangle words retain their operations separately from this CF presentation.

## Explore

Start at **5/13 = [0; 2, 1, 1, 2]**, or enter 7/19, 355/113, φ, or √2. Enter a rational, signed integer, exact decimal, or regular continued-fraction list. Bracketed lists such as `[0; 2, 1, 1, 2]` terminate as exact rationals. Decimals are also exact rationals. Enter `phi` (or `φ`) and `sqrt2` (or `√2`) for supported exact periodic irrationals; editing their coefficients preserves the periodic tail. Coefficient a₀ may be any integer; later coefficients must be positive integers.

- **Play**, reverse, scrub, or step between Farey crossings and coefficient runs. Time measures hyperbolic distance, with `z(t) = α + 2i exp(−t)`.
- **Auto zoom** is on by default: the view magnifies as `exp(0.92t)`, so the point keeps descending slowly in the viewport, with remaining screen height proportional to `exp(−0.08t)`. Turn it off for a fixed camera. Seeking and reverse playback retrace the same camera motion.
- **Two-finger vertical drag** zooms the hyperbolic view: up zooms in, down zooms out. Both touchscreen gestures and trackpad scrolling work over the canvas; scrolling elsewhere still moves the page. The gesture changes only the camera and combines with automatic zoom.
- Switch Farey edges, Ford circles, modular domains, labels, convergents, and trajectory independently in both H² and Poincare Disk. The flip path appears automatically in either model only when its companion is **Marked torus · edge flips**. Modular-domain boundaries refine with the visible Farey triangles, revealing smaller copies as you zoom in. Blue T-paired edges and orange S-paired edges match the folded and 3D quotient views. The 3D orbifold and modular torus have filled, shaded surfaces at 78% opacity; rear curves show through faintly.
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

## Rational tangles

The **Marked rational tangle** panel shares the exact number and undo history with the continued fraction, H², and rectangle views.

- Start with **Zero tangle** (horizontal arcs) or **Infinity tangle** (vertical arcs). Endpoints stay marked NW, NE, SW, SE. **Add +1 / −1 endpoint twist** acts at the right pair and changes x to x±1. **Quarter-turn ↺ / ↻** rotates the actual diagram and changes x to −1/x; **Mirror crossings** sends x to −x.
- Select a signed twist region in the expression, or click its diagram crossings, then edit its count. The chronological expression remains separate from the regular continued fraction, including cancelling twists and rotations. **Remove last operation** reverses the last recorded construction step. Undo/redo restores the expression and shared number together. Editing the continued fraction or endpoint generates a new canonical diagram expression.
- **Lifted tangle 3D** draws each twist region as two strands winding around a shared axis: each signed half-twist adds a half-turn, and its sign controls the helix handedness. Smooth transitions join different twist axes. Drag to rotate the model, or click a strand to select its twist region. The primary 2D view shows gaps at underpasses. Zoom and scroll to inspect a long construction. Regions above 24 twists, or beyond the total 160-crossing detail budget, use boxes with exact signed counts and connectivity. Detailed 3D requires at most 180 edges and no aggregate boxes. Operation words are capped at 512, with up to 1,024 digits per twist count and a 100 KB operation budget, within the existing number/display validation limits.
- For φ, √2, or another exact periodic input, explicitly choose a **Finite diagram approximation**. The panel labels it as an approximation. Editing this tangle switches the shared value to the resulting rational; undo restores the exact irrational.

View choices, diagram zoom, and camera angles are session UI settings. Scene JSON and shared links preserve the exact number and signed operation word, including zero and infinity. No external diagrams or mesh assets are required.

When **Punctured torus** is selected, the H² viewer lightly fills modular-domain copies with the matching six sheet colors in both the flat hexagon and 3D surface modes. Changing **Cover lift** updates the plane colors to match the selected lift; switching back to **Modular orbifold** removes these fills. The **Modular domains** checkbox independently controls domain edges.

## Poincare Disk and marked torus edge flips

The **Marked torus · edge flips** panel starts with slopes **a₀, ∞, a₀+1** (thus **0, ∞, 1** for 0 < α < 1) in the fixed meridian–longitude basis. A slope p/q represents the primitive vector (q,p), up to overall sign. This editor uses the Farey combinatorial correspondence; it does not assign a homology slope to the moving ray on the six-sheet hyperbolic cover.

- Use the two view selectors to pair **Poincare Disk** with **Marked torus · edge flips**. Both panes show one shared exact triangulation and one playback position. The lattice pane owns the shared Play/Pause, Previous/Next, restart, and history controls; shared undo/redo also restores flips.
- A lattice edge of slope p/q corresponds to a Farey vertex, its three edge slopes form a Farey triangle, and flipping an edge crosses the opposite Farey side. Colors match the three edge classes across the views. The target α determines the path; stepping the path never replaces it.
- The lattice controls beneath the diagram offer **Restart flips**, **Previous/Next flip step**, and playback. Restart pauses playback and returns to step zero without changing α or deleting the generated path. You can also click the next/previous triangle or edge on α’s path; other neighbors are context only. Colored slope buttons highlight edge classes. The lattice diagram stays visible during navigation, with a short caption naming the retained and replaced slopes.
- The path reuses the vertical ray’s Farey itinerary. The initial crossing is separate from the L/R runs; a₀ translates the starting bracket, a₁ has the initial −1 offset, and a rational’s last run has another −1 offset (both apply when there is only one fractional coefficient). Zero-length runs create no fake flips. The caption shows the selected coefficient, direction, completed flips, and full run length. **Go to aₙ = …** seeks to the selected coefficient’s first flip. Enable **Follow selected coefficient** in the shared playback bar to seek automatically when clicking a coefficient above; the option is shared by both panes. With following off, selection only highlights the run. A zero-length run selects its preceding boundary triangle, while a run beyond the generated depth is explicitly unavailable. Selecting a₀ returns to the start. For rectangle pairs, automatic coefficient synchronization takes precedence.
- The disk offers the H² layer controls: Farey tiling, Ford horocycles (including the image of y=1 at infinity), modular seams, rational labels, convergents, and trajectory. Ford circles can be inspected and their endpoints selected. Dragging α uses the same rational preview/snapping and one-step undo as H²; pan, wheel/two-finger zoom, and camera buttons only change the camera. Pairing with the modular torus colors the same six domain sheets.
- The Poincaré disk labels α on the boundary (using an exact convergent for its display position when irrational) and shows the actual moving H² point. A solid orange trail marks the traveled segment from t=0 to the current point, retracing during reverse playback or seeking; the dashed line shows the full geodesic. The Trajectory toggle controls both. **Keep moving point centered** smoothly moves the tessellation around that point during playback or scrubbing. Unchecking it freezes the camera; **Center Farey triangle** centers the current triangle once. These camera controls preserve α and the exact slopes.
- Each Farey triangle has a fixed gold, blue, orange, or purple fill. Adjacent triangles have different colors, and a triangle keeps its color through playback, camera changes, target edits, and undo. H² shows the same fills when paired with **Poincare Disk** or **Marked torus · edge flips**. The lattice domain’s two faces inherit the current Farey triangle’s color; edge colors still match its vertex labels. When paired with Edge flips, the current Farey triangle has three colored sides: crossing a side replaces the slope of that color in the lattice. The dual path keeps its coefficient colors (completed segments solid, future segments dashed). These triangle colors are separate from the six-sheet domain colors used when H² is paired with the punctured modular torus.
- Flip playback advances the shared H² point continuously between crossings (1.4 seconds per full flip interval at 1×). Pause/resume preserves progress within an interval; Previous/Next seeks to a crossing. This timing differs from constant-speed hyperbolic playback but uses the same trajectory position.
- H² Play/Pause and reverse playback also drive the follow-target flip position at the recorded crossing times. Flip steps seek those times in H² and its quotient/cover views; independent flip playback advances one crossing per beat. Rectangle stages automatically share a coefficient-run clock with compatible hyperbolic and flip views.
- Rational following stops at a triangle incident to the target cusp, not at finite-time arrival at the ideal endpoint. Integer rays lie on a Farey edge and use the right-hand triangle without inventing crossings. Irrational itineraries extend on demand with explicit display limits.
- **Flip history** contains undo/redo, itinerary extension, and the recorded path. Select one of the three slope buttons below the diagram, then use the single **Use … as α** action to change the shared target. The lattice view alone offers **Show a hole at the shared corner**: the four corners are one identified point on the torus, and this marks it as a puncture. H² automatically shows the current triangulation when paired with either flip view; otherwise its **Marked triangulation** checkbox lives with the H² layers. The full atlas uses **Euclidean lattice / Poincare Disk** tabs instead of stacking diagrams; the disk tab has no flip-path overlay because it is not beside the lattice. The marked triangulation is distinct from the six-sheet modular torus cover.

The lattice uses an exact unimodular parallelogram whose two faces form the current triangulation. Translates tile the Euclidean plane; the central domain is darker. Uniform camera scaling fits that entire domain while retaining the fixed meridian–longitude axes. Background edges are three families of parallel lines; subpixel-dense families (spacing below two pixels) are omitted with a notice, while the central domain and exact slopes are retained. The flip history holds up to 512 steps and shared undo retains the existing 50-edit budget. The disk draws at most 180 adaptive triangles, omitting tiny boundary detail with a notice when the budget is reached. Infinity has no finite vertical H² ray, so its disk has no moving point.

### Reading paired views

- The colored coefficient at the top is the common inspection focus. Edit it there. Plane models and quotient surfaces show its trajectory interval with the same accent; the traveled trail and the moving orange point still have their own time. a₀ sets the starting bracket, and initial/terminal offsets can leave a coefficient with no flips. A run overlay can include future portions.
- During ordinary hyperbolic playback, a₀ is highlighted before the first Farey bracket entry, and a₁ from that entry through the first fractional run. Thus a₁ = 1 still has a visible interval despite contributing zero L-turn flips. For example, `13/20 = [0;1,1,1,6]` displays a₀ → a₁ → a₂. A zero a₀ is an explicit zero-twist box/orientation step; a nonzero a₀ is the integer translation and corresponding twist group. These presentation intervals also drive the trajectory accents and seeking. They do not reassign the initial crossing's `term=0` or alter the separate linked Euclidean-stage clock.
- Plane models mark the selected convergent and its Ford circle. Inspecting a circle highlights that rational in both panes without editing α. **Use this endpoint** makes it the target. With a finite irrational tangle or braid present, the marker identifies the explicitly chosen approximation instead.
- For irrational tangles/braids, one **Finite diagram approximation** selector controls both diagrams. Selecting another coefficient does not change that approximation. A coefficient beyond the prefix has no twist region. A canonical tangle merges a final `…, a, 1` to `…, a+1`; its region retains both source indices. The braid's split terminal boxes likewise retain their source coefficient. Custom signed tangle words link through their rational value, not an assumed coefficient-to-operation map.
- The disk and lattice share edge inspection and three edge colors. Slope labels identify convergents/intermediate convergents only after exact integer checks. The target remains separate; **Use … as α** is explicit. Camera changes preserve the marking and slopes.
- Beside a surface, a neutral outline identifies the containing modular copy in H²/disk and the active sheet on the six-sheet cover. **Match surface layers** shows modular domains without Farey/Ford clutter. A thick S/T cue occurs only near an actual modular chart seam (including reverse seeking), not every Farey crossing. Sheet colors and fixed Farey fills do not change with coefficient selection.
- A rectangle group shows its square count, actual remainder dimensions, and the next CF tail. The tail uses the next Euclidean orientation, which may be height/width. Zero remainder is exact rational termination; irrational display cutoffs are not termination.
- When tangle and braid are paired, dashed NW–NE and SW–SE arcs show the numerator closure. Dashed braid caps distinguish the plat closure. These are equivalent closed-link presentations; the app does not claim a pointwise strand identification or animate an unverified isotopy. Strand colors remain distinct from the coefficient halo.

Diagram guides, signed tangle editing, and cover details are collapsed by default in the comparison workspace. **Inspect twists** can scroll the full braid, including its bottom closure. The full atlas retains its standalone controls. The modular torus remains a six-sheet hyperbolic cover, not the marked triangulation torus or a rational tangle's branched cover.

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

**Implemented:** the original number/Farey/Ford views, modular orbifold atlas, rectangle dissection, six-sheet commutator cover, marked rational tangles. The marked torus/pillowcase view has been removed pending a clearer visual design. Marked two-triangle torus flips are also implemented. Lens-space labels and tetrahedron layering are not included. The verified conventions, derivations, and source sections are in [TOPOLOGY.md](docs/TOPOLOGY.md).

## Project map

- `src/math/`: rational arithmetic, exact renderer-independent rectangle dissection, continued fractions, Farey traversal, Ford contacts, modular matrices/reduction, and a deterministic event timeline.
- `src/state.ts`: typed number/tangle/load commands, undo/redo, validation, and versioned persistence.
- `src/renderers/`: Canvas upper-half-plane, SVG rectangle dissection and folded quotient, six-sheet torus atlas, and marked tangles.
- `tests/`: exact fixtures, generated rational tests, seam/atlas tests, state checks, browser checks, and benchmarks.

## Credits and license

**David Bachman** conceived the project, supplied its mathematical design and requirements, and owns the repository. **OpenAI Codex** implemented the application, tests, documentation, and deployment configuration in collaboration with David. AI assistance is credited as development assistance; it is not an independent claim of mathematical authorship or copyright ownership.

Mathematical background is credited to Caroline Series, David Grabiner and Jeffrey Lagarias, and Ian Short, with references and verification notes in [MATHEMATICS.md](docs/MATHEMATICS.md). Boris Springborn and Louis Kauffman–Sofia Lambropoulou supply the cover and tangle references checked in [TOPOLOGY.md](docs/TOPOLOGY.md). No third-party diagrams were copied. Interface icons come from [Lucide](https://lucide.dev/) (ISC license); React, Vite, TypeScript, Vitest, and Playwright retain their respective upstream licenses.

This project's original source is distributed under the **[MIT License](LICENSE)**, copyright © 2026 David Bachman.
