# Mathematical conventions

## Scope and exact numbers

The original quotient is the modular orbifold (one cusp, cone orders 2 and 3). The expanded application also implements its schematic atlas, the six-sheet commutator torus, marked rational tangles, and the separate branched-cover torus/pillowcase. Their conventions, checked source sections, and derivations are documented in [TOPOLOGY.md](TOPOLOGY.md). Marked two-triangle torus flips are now implemented with the fixed-basis conventions in that document. Lens-space labels and tetrahedron layering are not implemented.

Rationals are normalized BigInt pairs with positive denominator. Infinity is the single projective value 1/0, supported by the kernel but not a finite vertical endpoint. Negative continued fractions use floor division. Finite regular expressions have positive tail coefficients and are canonicalized to a final term > 1. An alternate ending preserves value. Decimal input is an exact decimal rational, never an inferred irrational. A finite prefix either terminates or is explicitly completed with an infinite tail of ones. Presets φ=[1;overline(1)] and √2=[1;overline(2)] retain their periodic specifications.

## Farey cutting convention, derived here

The Farey disk uses a moving Poincaré chart. For camera center `x₀+i h`, first set `w=(z−x₀)/h`, then apply `(w−i)/(w+i)` (negating the imaginary coordinate for SVG). With **Keep moving point centered**, `x₀=α` and `h=y(t)`, so the actual H² trajectory point stays at the origin while all Farey vertices and geodesics move continuously. The projection depends on time, not the discrete flip cursor. Freezing or centering the camera never changes the number or triangulation. Real coordinates are subtracted as exact rationals before conversion to display doubles to preserve small triangles near deep convergents.

Triangle fills use a fixed four-coloring. Reduce each primitive slope vector `(q,p)` modulo 3 to a point of `P¹(F₃)={0,∞,1,−1}`. The determinant-one condition makes the three vertex classes distinct. Color the triangle by its missing class: 0 → blue, ∞ → orange, 1 → purple, −1 → gold. For a retained basis u,v, the two diagonals u+v and u−v represent the other two distinct projective classes modulo 3, so a flip always changes color. The assignment is independent of vertex order, overall vector signs, camera, target, and history. It uses exact BigInt residues. The initial `(0,∞,1)` triangle is gold and its three neighbors recover the original blue/orange/purple palette.

The disk and H² share these triangle colors when comparing Farey triangles or marked-square flips. The marked square’s two faces inherit the color of its slope triple; they do not represent two different Farey triangles. Edge identities and coefficient/run colors remain separate. H² paired with the six-sheet modular torus retains its modular-domain coloring instead; the four-coloring is not a sheet or homology identification for that cover. Disk detail is capped at 180 adaptive triangles, while H² uses its existing visible-edge budget. Flip playback interpolates shared hyperbolic time between successive exact crossing positions, using 1.4 seconds per complete interval at 1×; explicit Previous/Next seeks to the crossing. Thus its visual speed varies from interval to interval, and rational playback still ends at the last itinerary triangle rather than reaching an ideal cusp in finite time.

Translate by a₀=floor(α), and bracket the fractional part by [0/1,1/1]. The initial semicircle crossing is a separate event. At each mediant m, L replaces the upper endpoint when α<m; R replaces the lower endpoint when α>m; equality stops the traversal. Each replacement crosses the new bracket's edge. Its height is sqrt((α-l)(r-α)). The whole new bracket lies inside its predecessor, so these heights strictly decrease. Translations restore a₀ to all displayed labels. Integers lie on a vertical Farey edge; they have no transverse crossing word.

For a nonintegral canonical rational [a₀;a₁,…,aₙ], the runs alternate L,R, starting with a₁−1 L's, followed by aᵢ moves in interior runs, and aₙ−1 moves in the terminal run. If n=1 both endpoint offsets apply: a₁−2 moves. Zero-length runs are retained as coefficient metadata, not as fake crossings. For infinite expansions only the initial −1 offset applies. Derivation: in each bracket repeated mediant replacements subtract one from the current Euclidean quotient. The initial [0,1] bracket consumes one subtraction; equality at the final mediant consumes the last. Thus 2/5 gives LR; 1/2 gives the empty word; 5/13 gives LRLR; √2−1 gives LRRLLRR…. The integer part translates the entire picture and contributes no run. Tests independently compute the mediant word and compare these lengths, including exhaustive small rationals.

## Ford horoballs and time

For reduced p/q the radius and center height are r=1/(2q²); infinity has boundary y=1. Circle entry/exit are calculated independently of convergent or Farey status. With δ=α−p/q, solve (y−r)²=r²−δ², using y₊=r+sqrt(r²−δ²) and y₋=δ²/y₊. Exact rational comparisons decide miss, tangency, or interior intersection before conversion to floating point. δ=0 has no finite exit. The φ ray misses 1/1; the 1/2 ray is tangent to 0/1 and 1/1.

Motion is z(t)=α+2i exp(−t). Time is hyperbolic arclength from finite height 2; neither endpoint at infinity is reached. Rational playback ends at a displayed height cutoff. Periodic inputs extend the prefix and time horizon on demand up to a disclosed floating-point rendering limit t=24. Arithmetic remains exact independently of drawing depth. Events are immutable derived data, independent of camera or seek history. Ford events cover the declared denominator bound (q≤32) plus computed convergents; this finite event window is labeled.

## Modular reduction and seams

S=[[0,−1],[1,0]], T=[[1,1],[0,1]] act by (az+b)/(cz+d); matrices compose on the left and have determinant one. F={|x|≤1/2, |z|≥1}. Translate by floor(x+1/2), choosing the left side at x=+1/2, then apply S only when |z|²<1−10⁻¹². Points on the unit circle stay in the current copy. This deterministic half-open rule leaves the order-two and order-three fixed points visible. Tangents transform by v/(cz+d)²; the exact matrix is kept even though coordinates are numerical.

For each constant-matrix segment, seam times are solved analytically in the original ray coordinate u=y². Vertical boundaries solve Re(Mz)=±1/2; the circular boundary solves |Mz|²=1. We select the next positive root in descending y, verify a matrix change immediately beyond it, and re-reduce. Render paths end and restart at the same seam time in their two charts. They are never joined across the domain; paired locations represent one quotient point. Sampling inside a chart only approximates the drawn curve, not the seam decision. A seam/time guard reports insufficient precision instead of connecting suspect points. The mapped tangent accompanies the current point.

## Geometry and display limits

Farey triangles have area π; modular domains have area π/3. Their overlays are separate. Farey geometry is generated by visible mediant subdivision, stopped by pixel diameter, depth, and a geometry budget. The modular overlay refines with the same visible Farey triangles, using the exact subdivision described below and a 1.5-pixel minimum supporting radius. It has the shared 28-level/2,200-edge geometry budget rather than a fixed group-word cutoff. Ford disks and their exact labels are selected explicitly; inspection never changes α. Dragging the boundary marker updates the exact endpoint immediately and pauses playback, preserving the current time and the camera frame. Release records one undoable edit; a cancelled gesture restores the original scene. Rationals with denominator ≤64 snap within 6 pixels; otherwise the screen coordinate is explicitly rounded to a decimal rational with precision chosen from the pixel scale.

Double precision renders geometry only. Exact comparisons use rational arithmetic and enclosing intervals for periodic CFs. Rendering is restricted to |α|≤10,000 and t≤24; limitations are explicit rather than promises of unlimited zoom. No six-sheet cover, closed quadratic orbit, homology slope, knot, or lens-space label is inferred from a vertical endpoint.

## References and verification status

- Caroline Series, _The Modular Surface and Continued Fractions_, J. London Math. Soc. (2) **31** (1985), pp. 69–80, https://doi.org/10.1112/jlms/s2-31.1.69. Background for cutting sequences; the exact initial/terminal convention used here is derived above, rather than attributed to a differently oriented coding.
- Grabiner and Lagarias, _Cutting Sequences for Geodesic Flow on the Modular Surface and Continued Fractions_, https://arxiv.org/abs/math/9707215, introductory discussion of geometric versus arithmetic coding. We keep standard-domain seam coding separate from Farey coding.
- Ian Short, _Ford Circles, Continued Fractions, and Rational Approximation_, https://arxiv.org/abs/0912.1997, §1 (Ford circles and convergents). Our trajectory intersection formula is independently derived above from the circle equation.

These are the design's reading references, not copied implementation or figures. Page/section details beyond those listed have not been independently verified in this environment. All implemented formulas and offset claims are backed by the derivations and executable fixtures in this repository. The topology sources checked for the expanded scope are documented separately in [TOPOLOGY.md](TOPOLOGY.md).

## Schematic quotient atlas

Write `u = x + 1/2`, `v = log(y / sqrt(1-x²))`, `h = v/(1+v)`, and `θ = 2πu`. The displayed surface is

`((1-h) cos θ, (1-h) sin θ sqrt(h), 2h - 0.65)`.

For `v>0`, cross sections are nested ellipses; as `v→∞` they shrink to the removed cusp. At `v=0` the base circle folds to a segment: `u` and `1-u` agree. This is exactly the S identification on the unit circle. At `u=0,1`, the two vertical sides agree, implementing T. The fold endpoints mark the cone points of orders 2 and 3. This is a topological atlas with creases, not a smooth isometric embedding. Automated tests check both seam identifications; numerical projection and rotation never alter the mathematical trajectory.

## Measured fixture performance

On the managed Linux environment used for the initial release (Node 24), `npm run benchmark` measured mean event derivation times of **0.29 ms** for 5/13, **0.37 ms** for 355/113, and **13.22 ms** for φ, all through `t=18`, with Ford denominator bound 32 plus computed convergents. The declared 800-pixel Farey geometry fixture averaged **0.06 ms**. These measurements cover the mathematical derivation, not browser frame rate. They are reproducible benchmarks, not a promise of unlimited precision or universal 60 fps.

## Slow-descent automatic camera

Automatic zoom is enabled by default. Its scale multiplier is `exp(0.92t)`, giving screen distance above the fixed real axis proportional to `y(t) exp(0.92t) = 2 exp(−0.08t)`. Thus the point still descends, with 8% of the fixed-camera logarithmic descent rate. This is a camera transformation only: mathematical time, event IDs, and crossing heights remain unchanged. Seeking and reversing use the same absolute-time formula. Manual zoom multiplies this scale; disabling Auto zoom gives a fixed camera. At extreme zoom or large coordinates, scale is capped at `1/(64 ε max(1, |center|))` to keep neighboring screen pixels numerically distinguishable; beyond that limit the point descends without further magnification.

Scene format version 2 preserves this camera preference; importing a legacy version 1 scene enables the new automatic zoom.

## Adaptive modular tessellation

In the reference ideal triangle `(0,1,∞)`, six modular boundary spokes meet at `1/2 + i√3/2`. They combine into three geodesic pieces: the unit-circle quarter arc from `i` to `1`, the unit-circle quarter arc centered at `1` from `1+i` to `0`, and the vertical ray from `1/2+i/2` to infinity. These are boundary portions of full PSL(2,ℤ) domains, not Farey edges and not a claim that a Farey triangle is itself a modular domain. Across Farey sides the pieces join the adjacent triangle's subdivision.

For Farey neighbors `l=p/q < r=u/v`, the determinant-one matrix `[[u,p],[v,q]]` maps `(0,1,∞)` to `(l, mediant(l,r), r)`. We transform the three geodesic pieces with this matrix for every visible Farey interval, and also include translated `(n,n+1,∞)` triangles. The transformed ideal support endpoints determine each circle or vertical line; their exact integer determinant determines the diameter, avoiding subtraction of almost equal endpoint coordinates. Canvas draws the resulting analytic arcs, with vertical rays clipped to the viewport rather than approximating infinity by a finite sample. Finer visible triangles therefore reveal finer modular copies during automatic zoom, manual zoom, or two-finger zoom.

## Rectangle dissection

The initial rectangle is `[0, α] × [0, 1]`, with α positive. At even coefficient index n, remove aₙ squares along the width; at odd n, remove them along the height. If the working dimensions are w × h, an even stage leaves `(w − aₙh) × h` and an odd stage leaves `w × (h − aₙw)`. Square positions and the remainder share the same original coordinate system. For 0 < α < 1, a₀ = 0 changes the cutting orientation and leaves the original rectangle intact.

The kernel stores coordinates and dimensions as integer linear forms `mα + b`. For rational α = p/q these evaluate exactly to `(mp + bq)/q`; termination is tested against an exact zero numerator. For an exact periodic input, the existing prefix/period supplies the Euclidean quotients on demand. All remainders stay symbolic and no periodic stage is marked terminal. The stage-area identity `wh = aₙs² + remainder area` is a polynomial identity in α, verified without floating-point approximations.

The renderer evaluates symbolic differences before converting to screen coordinates. A 128-term exact convergent supplies only a projection for periodic values; counts and termination never depend on that approximation. Follow-remainder coordinates are normalized relative to the working rectangle so that deep stages do not lose their position through subtraction of nearby floating-point numbers. Rendering budgets and the 96-stage periodic display cap do not assert mathematical termination.

Rectangle stage indices are canonical continued-fraction coefficient indices. The existing Farey coding map selects the corresponding run in H²; rectangle playback neither advances hyperbolic time nor associates a stage with a Ford contact.


## Prefix enclosures, integer lattice, matrix products, and errors

For each regular prefix `[a₀; …, aₙ]`, let `cₙ = pₙ/qₙ` with seeds `p₋₂=0, p₋₁=1, q₋₂=1, q₋₁=0`. These exact arithmetic identities support convergent calculations; matrix products, interval, lattice, and error plots are not standalone views in the app. Define

`A(a) = [[a,1],[1,0]]`,

`Mₙ = A(a₀) … A(aₙ) = [[pₙ,pₙ₋₁],[qₙ,qₙ₋₁]]`.

Multiplication appends on the **right**, so both rows obey the convergent recurrence. `det Mₙ = (−1)^(n+1)`. We reuse integer matrix multiplication and determinants only; the H² action/inverse helpers assume determinant +1 and are not applied to these determinant −1 factors.

For a real complete tail `t ≥ 1`, the prefix acts as

`fₙ(t) = (pₙt + pₙ₋₁)/(qₙt + qₙ₋₁)`.

The limits at `t=1` and `t→∞` are the mediant with the previous convergent and the current convergent. Sorting them gives the closed prefix enclosure. Its width is exactly `1/[qₙ(qₙ+qₙ₋₁)]`. These closed intervals are nested; their interiors contain the selected infinite periodic expansion. We deliberately call them enclosures rather than claiming both rational endpoints have that canonical finite prefix. Rational alternate endings identify boundary points. At rational termination, α equals one endpoint; the prefix enclosure still has positive width.

Lattice vectors are `vₙ=(qₙ,pₙ)`, with `v₋₂=(1,0)`, `v₋₁=(0,1)`. They satisfy `vₙ=aₙvₙ₋₁+vₙ₋₂` and `det(vₙ₋₁,vₙ)=(−1)^(n+1)`, hence the adjacent cell has area one. The basis close-up expresses `w` as

`(det(w,vₙ)/d, det(vₙ₋₁,w)/d)`, where `d=det(vₙ₋₁,vₙ)=±1`.

This is an exact integer change of coordinates. Its displayed unit square is an affine view, not a claim about Euclidean angles or a homology map on the six-sheet modular torus. The fixed-axis view uses equal scale on q and p. The target line’s projection uses a deep enclosing rational only for display.

For rational α, signed errors `α−pₙ/qₙ` are exact rational differences, with a zero numerator iff the convergent is α. For periodic α, compute an enclosure from at least 16 terms beyond **all** displayed prefixes (also beyond the nonperiodic prefix), by exact matrix recurrence. Subtract each displayed convergent from both enclosure endpoints before taking absolute values and multiplying by `qₙ²` if requested. This gives certified nonzero rational error bounds even beyond double-precision resolution. Periodic tails supply these internal extra terms without extending the editable/displayed state. The plotted lower bound approximates the error; the exact bounds are inspectable. No approximate zero decides termination.

Coordinate ratios use leading integer digits after exact rational arithmetic; logarithms use integer digit lengths. This avoids overflow from converting huge numerator/denominator pairs separately, and cancellation from subtracting nearly equal doubles. Rational zero is represented on a separate row outside the log axis. Polyline segments connect discrete convergents only. Render budgets and local cameras never change α, exact vectors, or the shared history.

## Continued-fraction braid / four-plat

The dedicated braid view reads the regular continued fraction from top to bottom. Its four vertical slots are `R, 1, 2, 3`; only the last three participate in crossings. Blocks alternate between slots `1–2` and `2–3`. The top and bottom caps pair `R–1` and `2–3`. This is a plat closure, not the ordinary closure of a three-strand braid. It gives the unoriented numerator-closure knot/link of the displayed rational tangle.

We use the three-active-strand presentation and terminal ambiguity in Kauffman–Lambropoulou, *On the Classification of Rational Knots*, [Figures 9–10 and Remark 1](https://arxiv.org/pdf/math/0212011), with their coefficient numbering shifted to start at `a₀`. An even number of CF terms is changed **for this display only** to an odd number using `[…, a] = […, a−1, 1]`. Both resulting boxes carry the original final coefficient index and color. Zero boxes remain visible. Negative α uses its regular CF, which need not give an alternating diagram.

The frozen local convention is: read downwards, with positive local exponent meaning **top-right over top-left**. Exponents alternate `a₀, −a₁, a₂, …` on the alternating pairs. For input Fox colors `(u,v)`, one such crossing outputs `(v,2v−u)`. To propagate upward through an entire block of exponent `n`, apply `(u,v) ↦ (u+n(u−v), v+n(u−v))`. Starting with bottom cap colors `(0,0,1,1)` and undoing the braid word in reverse produces top colors `(0,−p,q−p,q)`. Thus the displayed marked fraction is `(c₀−c₁)/(c₃−c₀) = p/q`. This recovers α independently of evaluating its CF. The exposed caps impose the numerator-closure relation; a closed knot alone does not determine this marked fraction.

For α=0, the zero block and ordinary caps form a two-component unlink. Infinity has no finite CF word: four straight strands with the usual top caps and nested bottom pairs `R–3, 1–2` give its crossing-free unknot closure. The infinity case is explicitly labeled and has no coefficient controls.

Each drawn crossing has its own over/under graph edges; curved SVG strands retain exactly this incidence. Blocks exceeding 16 crossings, or the total budget of 160 crossings, are opaque labeled bundles. Their exact permutation is determined by the parity of the BigInt count. Closure components are traced through this graph, including bundles, rather than merely inferred from the fraction. Tests independently recover the rational by Fox coloring, compare component counts over signed rational fixtures, and compare the normalized Kauffman bracket of small fully drawn plats against the existing numerator-closure diagrams, including chiral mirrors. Knot writhe fixtures fix the crossing-sign convention; link component orientations are not identified between the two drawings.

For irrational α, the finite diagram uses the shared selected convergent `Cₙ`; it never represents an infinite knot. Boxes retain the indices of the original prefix (including a terminal 1). Selecting an earlier box selects that shorter convergent. Editing `aₙ` edits the shared CF coefficient, preserving its periodic tail; **Use braid convergent as α** is the separate explicit action that makes the shared value rational. Rectangle or Farey playback updates coefficient highlighting through the existing selection state. There is no extra knot-animation clock or equivalence between twist counts and individual Farey crossings.
