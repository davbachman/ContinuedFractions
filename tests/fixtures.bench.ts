import { bench, describe } from "vitest";
import { derive } from "../src/math/trajectory";
import { parseInput } from "../src/math/continuedFraction";
import { visibleFarey } from "../src/math/farey";
describe("declared fixtures: event derivation and visible geometry", () => {
  for (const input of ["5/13", "355/113", "phi"]) {
    const spec = parseInput(input);
    bench(`${input}, t=18, q≤32 plus convergents`, () => {
      derive(spec, 18);
    });
  }
  bench("800 px scene, 200 px/unit, [-1.6, 2.4]", () => {
    visibleFarey(-1.6, 2.4, 200);
  });
});
