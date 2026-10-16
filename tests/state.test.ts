import { it, expect } from "vitest";
import {
  initialScene,
  followAlpha,
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
    const scene = followAlpha({ ...initialScene, spec, time: 4.3 });
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
it("every number edit rebuilds its target path, and navigation shares exact undo and persistence", () => {
  const base = { past: [], present: initialScene, future: [] };
  const path = initialScene.triangulation!;
  expect(path).toEqual(targetItinerary(initialScene.spec));
  const value = { ...path, cursor: 1 };
  const advanced = execute(base, {
    type: "triangulation",
    value,
    time: path.steps[0].time,
  });
  expect(advanced.present.spec).toEqual(initialScene.spec);
  expect(advanced.present.triangulation?.steps).toBe(path.steps);
  expect(
    triangleKey(currentTriangulation(advanced.present.triangulation!)),
  ).toBe("0 | 1/2 | 1");
  expect(deserialize(serialize(advanced.present))).toEqual(advanced.present);
  for (const input of ["13/5", "phi", "sqrt2", "3", "-2/3"]) {
    const spec = parseInput(input);
    const edited = execute(advanced, { type: "number", spec });
    expect(edited.present.triangulation).toEqual(targetItinerary(spec));
    expect(undo(edited).present).toEqual(advanced.present);
    expect(redo(undo(edited))).toEqual(edited);
  }
  expect(undo(advanced).present).toEqual(initialScene);
  expect(() =>
    execute(base, {
      type: "triangulation",
      value: appendFlip(initialTriangulation, 0, "torus"),
    }),
  ).toThrow("must follow");
  expect(() =>
    execute(base, {
      type: "triangulation",
      value: targetItinerary(parseInput("13/5")),
    }),
  ).toThrow("must follow");
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

it("extending hyperbolic depth extends the same α itinerary and preserves its playback position", () => {
  const spec = parseInput("phi");
  const before = followAlpha({ ...initialScene, spec, time: 10 });
  const after = followAlpha({ ...before, end: 16 });
  expect(after.spec).toBe(spec);
  expect(after.time).toBe(before.time);
  expect(after.triangulation!.cursor).toBe(before.triangulation!.cursor);
  expect(after.triangulation!.steps.length).toBeGreaterThan(
    before.triangulation!.steps.length,
  );
  expect(
    after.triangulation!.steps.slice(0, before.triangulation!.steps.length),
  ).toEqual(before.triangulation!.steps);
});

it("coefficient edits retain selection and seek its new interval; undo/redo and saving restore it", () => {
  const start = execute(
    { past: [], present: initialScene, future: [] },
    {
      type: "number",
      spec: parseInput("5/13"),
      selectedTerm: 2,
    },
  );
  const edited = execute(start, {
    type: "number",
    spec: parseInput("8/19"),
    selectedTerm: 2,
  });
  expect(edited.present.selectedTerm).toBe(2);
  expect(edited.present.time).toBeGreaterThan(0);
  expect(edited.present.time).not.toBe(start.present.time);
  expect(undo(edited).present).toEqual(start.present);
  expect(redo(undo(edited)).present).toEqual(edited.present);
  expect(deserialize(serialize(edited.present))).toEqual(edited.present);
  const shortened = execute(edited, {
    type: "number",
    spec: parseInput("3"),
    selectedTerm: 2,
  });
  expect(shortened.present.selectedTerm).toBe(0);
  expect(shortened.present.time).toBe(0);
});
