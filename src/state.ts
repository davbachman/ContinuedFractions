import {
  type NumberSpec,
  DEFAULT,
  validateSpec,
} from "./math/continuedFraction";
import { rational } from "./math/rational";
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
  time: number;
  end: number;
  speed: number;
  follow: boolean;
  overlays: Overlays;
}>;
export type Command =
  { type: "number"; spec: NumberSpec } | { type: "load"; scene: Scene };
export type History = { past: Scene[]; present: Scene; future: Scene[] };
export const initialScene: Scene = {
  spec: DEFAULT,
  time: 0,
  end: 12,
  speed: 1,
  follow: false,
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
  const next =
    c.type === "load"
      ? c.scene
      : { ...h.present, spec: c.spec, time: 0, end: 12 };
  validateSpec(next.spec);
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
  return JSON.stringify({ version: 1, scene }, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}
export function deserialize(text: string): Scene {
  if (text.length > 32000)
    throw new Error("Scene file exceeds the 32 KB limit.");
  const data = JSON.parse(text);
  if (data.version !== 1 || !data.scene)
    throw new Error("Expected an Atlas scene with version 1.");
  const raw = data.scene,
    s = raw.spec;
  const integer = (v: unknown) => {
    if (typeof v !== "string" || !/^[-]?\d{1,512}$/.test(v))
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
    time: raw.time,
    end: raw.end,
    speed: raw.speed,
    follow: raw.follow === true,
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
