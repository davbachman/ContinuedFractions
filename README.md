# Continued Fractions Atlas

An interactive mathematical instrument connecting continued fractions, the Farey tessellation, Ford circles, and the modular orbifold. Choose an exact number and follow one vertical hyperbolic geodesic through synchronized views.

**[Open the Atlas](https://davbachman.github.io/ContinuedFractions/)** · [Mathematical conventions](docs/MATHEMATICS.md) · [Original design](docs/DESIGN.txt)

## Explore

Start at **5/13 = [0; 2, 1, 1, 2]**, or select 7/19, 355/113, φ, or √2. Enter a rational, signed integer, exact decimal, or regular continued-fraction list. A finite prefix can terminate or explicitly continue with an infinite tail of ones.

- **Play**, reverse, scrub, or step between Farey crossings and coefficient runs. Time measures hyperbolic distance, with `z(t) = α + 2i exp(−t)`.
- **Auto zoom** is on by default: the view magnifies as `exp(0.92t)`, so the point keeps descending slowly in the viewport, with remaining screen height proportional to `exp(−0.08t)`. Turn it off for a fixed camera. Seeking and reverse playback retrace the same camera motion.
- Switch Farey edges, Ford circles, modular domains, labels, convergents, and the dual-tree path independently.
- Select a coefficient to inspect its convergent, error, determinant, and actual crossing run. Edit it to recompute the scene; undo/redo restores number edits.
- Inspect a Ford circle without changing the endpoint. Use **Use this endpoint** to apply it. Drag the α handle on the real axis to update the endpoint and every view immediately. Playback pauses during the drag, and the entire gesture is one undoable edit. Simple rationals with denominator at most 64 snap within 6 screen pixels; at deeper zoom, other positions use an explicitly rounded decimal rational.
- Compare the folded modular domain with the rotatable **Schematic 3D** quotient. Paired seams represent the same points; the curve never draws a false chord across a seam.
- **Download**, **Load**, or **Share scene**. Exact integers are serialized as decimal strings in versioned JSON (version 2; version 1 imports enable the new automatic zoom). A scene is also saved in local browser storage.
- On mobile, switch visual panels without changing the underlying state. Essential actions have labeled controls and touch support.

Keyboard: **Space** plays/pauses; **← / →** step Farey crossings; **Shift + ← / →** step coefficient runs; **Ctrl/Cmd + Z** undoes a number edit. Shortcuts do not intercept typing or native form controls. Reduced-motion preferences suppress decorative transitions; playback only begins by explicit action.

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

**Implemented:** phases A and B, plus phase C's folded quotient and rotatable schematic atlas. **Deferred as specified:** the six-sheet commutator-subgroup cover, marked torus flips, rational tangles, branched-cover slope conventions, knot closures, and lens-space labels. Their separate mathematical gates remain in the design document; no unverified topology is presented.

## Project map

- `src/math/`: rational arithmetic, continued fractions, Farey traversal, Ford contacts, modular matrices/reduction, and a deterministic event timeline.
- `src/state.ts`: typed number/load commands, undo/redo, validation, and versioned persistence.
- `src/renderers/`: Canvas upper-half-plane, SVG folded quotient, and the schematic atlas.
- `tests/`: exact fixtures, generated rational tests, seam/atlas tests, state checks, browser checks, and benchmarks.

## Credits and license

**David Bachman** conceived the project, supplied its mathematical design and requirements, and owns the repository. **OpenAI Codex** implemented the application, tests, documentation, and deployment configuration in collaboration with David. AI assistance is credited as development assistance; it is not an independent claim of mathematical authorship or copyright ownership.

Mathematical background is credited to Caroline Series, David Grabiner and Jeffrey Lagarias, and Ian Short, with references and verification notes in [MATHEMATICS.md](docs/MATHEMATICS.md). The supplied design also credits sources for the deferred topology work. No third-party diagrams were copied. Interface icons come from [Lucide](https://lucide.dev/) (ISC license); React, Vite, TypeScript, Vitest, and Playwright retain their respective upstream licenses.

This project's original source is distributed under the **[MIT License](LICENSE)**, copyright © 2026 David Bachman.
