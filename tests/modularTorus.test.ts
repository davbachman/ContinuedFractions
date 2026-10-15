import { describe, it, expect } from "vitest";
import {
  I,
  S,
  T,
  apply,
  tangent,
  inverse,
  multiply,
  matrixKey,
  quotientTrace,
  reduce,
} from "../src/math/modular";
import {
  abelianization,
  circularPairing,
  coverSheet,
  coverHex,
  coverSurface,
  coverTransition,
  coverTopology,
  translation,
  verticalPairing,
} from "../src/math/modularTorus";
const close = (a: readonly number[], b: readonly number[], digits = 8) =>
  a.forEach((x, i) => expect(x).toBeCloseTo(b[i], digits));
describe("commutator modular torus", () => {
  it("has the required abelianization, rather than the Gamma(2) coset action", () => {
    expect(abelianization(S)).toBe(3);
    expect(abelianization(T)).toBe(1);
    let m = I;
    for (let i = 0; i < 70; i++) {
      const g = i % 3 ? translation(BigInt((i % 7) - 3)) : S;
      expect(abelianization(multiply(g, m))).toBe(
        (abelianization(g) + abelianization(m)) % 6,
      );
      m = multiply(g, m);
      expect(abelianization(inverse(m))).toBe((6 - abelianization(m)) % 6);
    }
    expect(abelianization(multiply(T, T))).toBe(2); // T² is in Gamma(2), not our subgroup.
  });
  it("pairs all circular sides with the correct inverse and tangent orientation", () => {
    for (let j = 0; j < 6; j++) {
      const m = circularPairing(j);
      expect(abelianization(m)).toBe(0);
      expect(matrixKey(multiply(circularPairing((j + 3) % 6), m))).toBe(
        matrixKey(I),
      );
      for (const x of [-0.5, -0.31, 0, 0.2, 0.5]) {
        const y = Math.sqrt(1 - x * x),
          p = { x: j + x, y },
          v = { x: 0.23, y: -0.9 };
        const q = apply(m, p),
          w = tangent(m, p, v);
        close([q.x, q.y], [((j + 3) % 6) - x, y]);
        const back = apply(inverse(m), q),
          backV = tangent(inverse(m), q, w);
        close([back.x, back.y, backV.x, backV.y], [p.x, p.y, v.x, v.y]);
        close(
          coverSurface({ x, y }, j),
          coverSurface({ x: -x, y }, (j + 3) % 6),
        );
      }
    }
  });
  it("pairs the outer vertical sides by T^6 and its inverse with identical intrinsic tangents", () => {
    expect(matrixKey(multiply(inverse(verticalPairing), verticalPairing))).toBe(
      matrixKey(I),
    );
    for (const y of [Math.sqrt(3) / 2, 1, 3, 100]) {
      const p = { x: -0.5, y },
        v = { x: 0.2, y: -0.7 };
      const q = apply(verticalPairing, p);
      close([q.x, q.y], [5.5, y]);
      const back = apply(inverse(verticalPairing), q);
      close([back.x, back.y], [p.x, p.y]);
      expect(tangent(verticalPairing, p, v)).toEqual(v);
      expect(tangent(inverse(verticalPairing), q, v)).toEqual(v);
      close(coverSurface(p, 0), coverSurface({ x: 0.5, y }, 5));
    }
  });
  it("has one cusp of width six, two finite vertex classes, no elliptic stabilizers, and genus one", () => {
    const topology = coverTopology();
    expect(topology.cuspOrbit).toEqual([0, 1, 2, 3, 4, 5]);
    for (let k = 1; k < 6; k++)
      expect(abelianization(translation(BigInt(k)))).not.toBe(0);
    expect(abelianization(verticalPairing)).toBe(0);
    const orbits = (shift: number) => {
      const pending = new Set([0, 1, 2, 3, 4, 5]),
        out: number[][] = [];
      while (pending.size) {
        let j = [...pending][0];
        const cycle: number[] = [];
        do {
          cycle.push(j);
          pending.delete(j);
          j = (j + shift) % 6;
        } while (j !== cycle[0]);
        out.push(cycle);
      }
      return out;
    };
    expect(orbits(abelianization(S)).map((x) => x.length)).toEqual([2, 2, 2]);
    expect(orbits(abelianization(multiply(S, T))).map((x) => x.length)).toEqual(
      [3, 3],
    );
    expect(orbits(4).map((x) => x.sort())).toEqual(topology.vertexClasses);
    expect(topology.eulerCompact).toBe(0);
    expect(topology.genus).toBe(1);
    // Euler characteristic of the noncompact six-fold cover: 6*(-1/6)=-1=2-2g-1.
    expect(2 - 2 * topology.genus - topology.punctures).toBe(-1);
  });
  it("identifies every radial and opposite outer hex edge in the surface atlas", () => {
    for (let j = 0; j < 6; j++)
      for (const y of [Math.sqrt(3) / 2, 1, 2, 50]) {
        const a = coverHex({ x: 0.5, y }, j),
          b = coverHex({ x: -0.5, y }, (j + 1) % 6);
        close([a.x, a.y], [b.x, b.y]);
        close(
          coverSurface({ x: 0.5, y }, j),
          coverSurface({ x: -0.5, y }, (j + 1) % 6),
        );
      }
  });
  it("uses the inverse reduction action and transports points and tangents in both playback directions", () => {
    expect(coverSheet(reduce({ x: 2.1, y: 2 }).matrix)).toBe(2);
    for (const alpha of [
      5 / 13,
      13 / 5,
      Math.SQRT2,
      (1 + Math.sqrt(5)) / 2,
      -0.4,
    ]) {
      const trace = quotientTrace(alpha, 12);
      for (const seam of [
        ...trace.seams,
        ...[...trace.seams]
          .reverse()
          .map((s) => ({ ...s, before: s.after, after: s.before })),
      ]) {
        const z = { x: alpha, y: 2 * Math.exp(-seam.time) },
          v = { x: 0, y: -z.y };
        const left = multiply(
          translation(BigInt(coverSheet(seam.before))),
          seam.before,
        );
        const right = multiply(
          translation(BigInt(coverSheet(seam.after))),
          seam.after,
        );
        const transition = coverTransition(seam.before, seam.after);
        expect(abelianization(transition)).toBe(0);
        const a = apply(left, z),
          b = apply(right, z),
          va = tangent(left, z, v),
          vb = tangent(right, z, v);
        const transported = apply(transition, a),
          velocity = tangent(transition, a, va);
        close(
          [transported.x, transported.y, velocity.x, velocity.y],
          [b.x, b.y, vb.x, vb.y],
          6,
        );
        close(
          coverSurface(apply(seam.before, z), coverSheet(seam.before)),
          coverSurface(apply(seam.after, z), coverSheet(seam.after)),
          6,
        );
      }
    }
  });
});
