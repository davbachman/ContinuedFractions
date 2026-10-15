import { it, expect } from "vitest";
import {
  initialScene,
  execute,
  undo,
  redo,
  serialize,
  deserialize,
} from "../src/state";
import { parseInput } from "../src/math/continuedFraction";
import { schematicPoint } from "../src/renderers/geometry";
it("round trips exact rational and periodic scenes and rejects unsafe schema data", () => {
  for (const spec of [
    parseInput("9007199254740993/10000000000000"),
    parseInput("phi"),
    parseInput("[0;2,3]", "ones"),
  ]) {
    const scene = { ...initialScene, spec, time: 4.3 };
    expect(deserialize(serialize(scene))).toEqual(scene);
  }
  expect(() => deserialize('{"version":3}')).toThrow();
  expect(() =>
    deserialize(serialize({ ...initialScene, time: 999 })),
  ).toThrow();
});
it("undo and redo restore entire scenes after typed edits", () => {
  const initial = { past: [], present: initialScene, future: [] };
  const changed = execute(initial, {
    type: "number",
    spec: parseInput("7/19"),
  });
  expect(undo(changed).present).toEqual(initialScene);
  expect(redo(undo(changed))).toEqual(changed);
});
it("schematic atlas identifies both vertical sides and both circular halves", () => {
  for (const y of [Math.sqrt(3) / 2, 1, 2, 5, 100]) {
    const l = schematicPoint({ x: -0.5, y }),
      r = schematicPoint({ x: 0.5, y });
    l.forEach((v, i) => expect(v).toBeCloseTo(r[i], 12));
  }
  for (let x = 0; x <= 0.5; x += 0.025) {
    const y = Math.sqrt(1 - x * x),
      a = schematicPoint({ x, y }),
      b = schematicPoint({ x: -x, y });
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 12));
  }
});

it("retains signed diagram operations independently of the canonical number across undo and persistence", () => {
  const base = { past: [], present: initialScene, future: [] };
  const start = execute(base, { type: "tangle", expression: [] });
  const positive = execute(start, {
    type: "tangle",
    expression: [{ kind: "twist", count: 1n }],
  });
  const cancelled = execute(positive, {
    type: "tangle",
    expression: [
      { kind: "twist", count: 1n },
      { kind: "twist", count: -1n },
    ],
  });
  expect(cancelled.present.spec).toEqual(start.present.spec);
  expect(cancelled.present.tangle).toHaveLength(2);
  expect(undo(cancelled)).toEqual({ ...positive, future: [cancelled.present] });
  expect(redo(undo(cancelled))).toEqual(cancelled);
  expect(deserialize(serialize(cancelled.present))).toEqual(cancelled.present);
  const edited = execute(cancelled, {
    type: "number",
    spec: parseInput("2/3"),
  });
  expect(edited.present.tangle).toBeUndefined();
  expect(undo(edited).present).toEqual(cancelled.present);
  const irrational = execute(base, { type: "number", spec: parseInput("phi") });
  expect(
    execute(irrational, { type: "tangle", expression: [] }).present.spec.kind,
  ).toBe("rational");
  const infinity = execute(base, {
    type: "tangle",
    expression: [{ kind: "rotate", turns: 1 }],
  });
  expect(deserialize(serialize(infinity.present))).toEqual(infinity.present);
});

it("imports old scenes and rejects inconsistent or oversized signed tangle words", () => {
  for (const version of [1, 2]) {
    const old = JSON.parse(serialize(initialScene));
    old.version = version;
    expect(deserialize(JSON.stringify(old))).toEqual(initialScene);
  }
  const raw = JSON.parse(serialize(initialScene));
  raw.scene.tangle = [{ kind: "twist", count: "2" }];
  expect(() => deserialize(JSON.stringify(raw))).toThrow("does not match");
  raw.scene.tangle = [{ kind: "rotate", turns: 2 }];
  expect(() => deserialize(JSON.stringify(raw))).toThrow(
    "Invalid tangle operation",
  );
  raw.scene.tangle = Array.from({ length: 513 }, () => ({
    kind: "rotate",
    turns: 1,
  }));
  expect(() => deserialize(JSON.stringify(raw))).toThrow(
    "Invalid tangle expression",
  );
});

import {
  initialTriangulation,
  appendFlip,
  currentTriangulation,
  triangleKey,
  targetItinerary,
} from "../src/math/triangulation";
it("flip commands preserve the independent target, round-trip exact history, and share undo with number edits", () => {
  const base = {
    past: [],
    present: { ...initialScene, time: 2, end: 4 },
    future: [],
  };
  const value = appendFlip(initialTriangulation, 0, "torus"),
    flipped = execute(base, { type: "triangulation", value });
  expect(flipped.present.spec).toEqual(initialScene.spec);
  expect(flipped.present.time).toBe(2);
  expect(flipped.present.end).toBe(4);
  expect(
    triangleKey(currentTriangulation(flipped.present.triangulation!)),
  ).toBe("2 | ∞ | 1");
  expect(deserialize(serialize(flipped.present))).toEqual(flipped.present);
  const edited = execute(flipped, { type: "number", spec: parseInput("3/7") });
  expect(edited.present.triangulation).toEqual(value);
  expect(undo(edited).present).toEqual(flipped.present);
  expect(undo(flipped).present).toEqual(base.present);
  expect(redo(undo(flipped))).toEqual(flipped);
  const follow = execute(edited, {
    type: "triangulation",
    value: targetItinerary(parseInput("3/7")),
  });
  const next = execute(follow, { type: "number", spec: parseInput("13/5") });
  expect(next.present.triangulation).toEqual(
    targetItinerary(parseInput("13/5")),
  );
  expect(undo(next).present).toEqual(follow.present);
});
it("rejects malformed flip paths without accepting a changed marking", () => {
  const raw = JSON.parse(
    serialize({ ...initialScene, triangulation: initialTriangulation }),
  );
  raw.scene.triangulation.steps = [{ edge: 3, source: "torus" }];
  expect(() => deserialize(JSON.stringify(raw))).toThrow("Invalid flip record");
  raw.scene.triangulation.steps = [];
  raw.scene.triangulation.start[2] = { p: "2", q: "1" };
  expect(() => deserialize(JSON.stringify(raw))).toThrow("determinant-one");
});
