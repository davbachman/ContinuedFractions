import {
  targetItinerary,
  validateTriangulationState,
  type TriangulationState,
  type Triangulation,
} from "./math/triangulation";
import {
  type NumberSpec,
  DEFAULT,
  validateSpec,
} from "./math/continuedFraction";
import { rational } from "./math/rational";
import {
  tangleFraction,
  validateTangle,
  type TangleExpression,
} from "./math/tangles";
export type Overlays = {
  farey: boolean;
  ford: boolean;
  modular: boolean;
  labels: boolean;
  trajectory: boolean;
  convergents: boolean;
  dual: boolean;
};
export type Scene = Readonly<{
  spec: NumberSpec;
  tangle?: TangleExpression;
  triangulation?: TriangulationState;
  time: number;
  end: number;
  speed: number;
  follow: boolean;
  overlays: Overlays;
}>;
export type Command =
  | { type: "number"; spec: NumberSpec }
  | { type: "load"; scene: Scene }
  | { type: "tangle"; expression: TangleExpression }
  | { type: "triangulation"; value: TriangulationState; time?: number };
export type History = { past: Scene[]; present: Scene; future: Scene[] };
export const initialScene: Scene = {
  spec: DEFAULT,
  time: 0,
  end: 12,
  speed: 1,
  follow: true,
  overlays: {
    farey: true,
    ford: true,
    modular: false,
    labels: true,
    trajectory: true,
    convergents: true,
    dual: false,
  },
};
export function execute(h: History, c: Command): History {
  let next =
    c.type === "load"
      ? c.scene
      : c.type === "triangulation"
        ? {
            ...h.present,
            triangulation: c.value,
            time: c.time ?? h.present.time,
            end:
              c.value.mode === "follow"
                ? Math.max(h.present.end, c.value.horizon)
                : h.present.end,
          }
        : c.type === "tangle"
          ? {
              ...h.present,
              spec: {
                kind: "rational" as const,
                value: tangleFraction(c.expression),
              },
              tangle: [...c.expression],
              time: 0,
              end: 12,
            }
          : { ...h.present, spec: c.spec, tangle: undefined, time: 0, end: 12 };
  validateSpec(next.spec);
  if (
    (c.type === "number" || c.type === "tangle") &&
    next.triangulation?.mode === "follow"
  )
    next = {
      ...next,
      end: Math.max(next.end, next.triangulation.horizon),
      triangulation: targetItinerary(next.spec, next.triangulation.horizon),
    };
  if (next.triangulation) validateTriangulationState(next.triangulation);
  return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past.at(-1)!,
    future: [h.present, ...h.future],
  };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}
export function serialize(scene: Scene) {
  return JSON.stringify({ version: 4, scene }, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}
export function deserialize(text: string): Scene {
  if (text.length > 128000)
    throw new Error("Scene file exceeds the 128 KB limit.");
  const data = JSON.parse(text);
  if (![1, 2, 3, 4].includes(data.version) || !data.scene)
    throw new Error("Expected an Atlas scene with version 1, 2, 3, or 4.");
  const raw = data.scene,
    s = raw.spec;
  const integer = (v: unknown) => {
    if (typeof v !== "string" || !/^[-]?\d{1,1024}$/.test(v))
      throw new Error("Invalid exact integer in scene.");
    return BigInt(v);
  };
  let spec: NumberSpec;
  if (s?.kind === "rational")
    spec = {
      kind: "rational",
      value: rational(integer(s.value?.p), integer(s.value?.q)),
    };
  else if (
    s?.kind === "periodic" &&
    Array.isArray(s.prefix) &&
    Array.isArray(s.period)
  )
    spec = {
      kind: "periodic",
      prefix: s.prefix.map(integer),
      period: s.period.map(integer),
    };
  else throw new Error("Unknown number specification.");
  validateSpec(spec);
  let tangle: TangleExpression | undefined;
  if (data.version >= 3 && raw.tangle !== undefined) {
    if (!Array.isArray(raw.tangle) || raw.tangle.length > 512)
      throw new Error("Invalid tangle expression.");
    tangle = raw.tangle.map(
      (op: { kind: string; count: unknown; turns: number }) => {
        if (op.kind === "twist")
          return { kind: "twist", count: integer(op.count) };
        if (op.kind === "rotate" && (op.turns === 1 || op.turns === -1))
          return { kind: "rotate", turns: op.turns };
        throw new Error("Invalid tangle operation.");
      },
    );
    validateTangle(tangle!);
    const r = tangleFraction(tangle!);
    if (
      spec.kind !== "rational" ||
      r.p !== spec.value.p ||
      r.q !== spec.value.q
    )
      throw new Error("Tangle expression does not match the shared number.");
  }
  let triangulation: TriangulationState | undefined;
  if (data.version >= 4 && raw.triangulation !== undefined) {
    const t = raw.triangulation;
    if (
      !Array.isArray(t.start) ||
      t.start.length !== 3 ||
      !Array.isArray(t.steps)
    )
      throw new Error("Invalid triangulation scene.");
    triangulation = {
      start: t.start.map((r: { p: unknown; q: unknown }) =>
        rational(integer(r.p), integer(r.q)),
      ) as unknown as Triangulation,
      steps: t.steps.map(
        (s: {
          edge: number;
          source: "torus" | "farey" | "follow";
          time?: number;
          term?: number;
        }) => ({
          edge: s.edge,
          source: s.source,
          ...(s.time !== undefined ? { time: s.time } : {}),
          ...(s.term !== undefined ? { term: s.term } : {}),
        }),
      ),
      cursor: t.cursor,
      mode: t.mode,
      horizon: t.horizon,
    };
    validateTriangulationState(triangulation);
  }
  for (const key of ["time", "end", "speed"])
    if (typeof raw[key] !== "number" || !Number.isFinite(raw[key]))
      throw new Error(`Invalid ${key}.`);
  if (
    raw.end < 4 ||
    raw.end > 24 ||
    raw.time < 0 ||
    raw.time > raw.end ||
    raw.speed < 0.1 ||
    raw.speed > 4
  )
    throw new Error("Scene playback values are outside display limits.");
  const overlays = { ...initialScene.overlays };
  for (const key of Object.keys(overlays) as (keyof Overlays)[]) {
    if (typeof raw.overlays?.[key] !== "boolean")
      throw new Error("Invalid overlay settings.");
    overlays[key] = raw.overlays[key];
  }
  return {
    spec,
    ...(tangle ? { tangle } : {}),
    ...(triangulation ? { triangulation } : {}),
    time: raw.time,
    end: raw.end,
    speed: raw.speed,
    follow: data.version === 1 ? true : raw.follow === true,
    overlays,
  };
}
export function sceneFromLocation(): { scene: Scene; error?: string } {
  try {
    const fragment = location.hash.startsWith("#scene=")
      ? decodeURIComponent(location.hash.slice(7))
      : undefined;
    const stored = fragment ?? localStorage.getItem("cf-atlas-scene");
    return { scene: stored ? deserialize(stored) : initialScene };
  } catch {
    return {
      scene: initialScene,
      error: "The saved or shared scene could not be read. Showing 5/13.",
    };
  }
}
