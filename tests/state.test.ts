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
