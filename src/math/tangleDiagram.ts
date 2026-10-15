import { abs, rational } from "./rational";
import { rotateEndpoints, type TangleExpression } from "./tangles";
export type DiagramNode = { x: number; y: number; color: bigint };
export type DiagramEdge = { from: number; to: number; region: number };
export type DiagramCrossing = { over: number; under: number; region: number };
export type TwistBox = { corners: number[]; count: bigint; region: number };
export function tangleDiagram(ops: TangleExpression) {
  let width = 100,
    height = 100,
    ends = [0, 1, 2, 3];
  const nodes: DiagramNode[] = [
    { x: 0, y: 0, color: 0n },
    { x: 100, y: 0, color: 0n },
    { x: 0, y: 100, color: 1n },
    { x: 100, y: 100, color: 1n },
  ];
  const edges: DiagramEdge[] = [
    { from: 0, to: 1, region: -1 },
    { from: 2, to: 3, region: -1 },
  ];
  const crossings: DiagramCrossing[] = [],
    boxes: TwistBox[] = [];
  const node = (x: number, y: number, color: bigint) => {
    nodes.push({ x, y, color });
    return nodes.length - 1;
  };
  for (const [region, op] of ops.entries()) {
    if (op.kind === "rotate") {
      for (const p of nodes) {
        const x = p.x,
          y = p.y;
        p.x = op.turns === 1 ? y : height - y;
        p.y = op.turns === 1 ? width - x : x;
      }
      [width, height] = [height, width];
      ends = rotateEndpoints(ends, op.turns);
      continue;
    }
    if (!op.count) continue;
    const detailed =
      abs(op.count) <= 24n && crossings.length + Number(abs(op.count)) <= 160;
    const steps = detailed ? Number(abs(op.count)) : 1;
    for (let k = 0; k < steps; k++) {
      const n = detailed ? (op.count > 0n ? 1n : -1n) : op.count,
        top = ends[1],
        bottom = ends[3];
      const b = nodes[top].color,
        d = nodes[bottom].color,
        delta = b - d,
        space = detailed ? 42 : 76;
      const nextTop = node(width + space, 0, b + n * delta),
        nextBottom = node(width + space, height, d + n * delta);
      const odd = abs(n) % 2n === 1n;
      const first = edges.length;
      edges.push(
        { from: top, to: odd ? nextBottom : nextTop, region },
        { from: bottom, to: odd ? nextTop : nextBottom, region },
      );
      if (detailed)
        crossings.push({
          over: n > 0n ? first : first + 1,
          under: n > 0n ? first + 1 : first,
          region,
        });
      else
        boxes.push({
          corners: [top, nextTop, nextBottom, bottom],
          count: n,
          region,
        });
      ends = [ends[0], nextTop, ends[2], nextBottom];
      width += space;
    }
  }
  const adjacency = nodes.map(() => [] as number[]);
  edges.forEach((e, i) => {
    adjacency[e.from].push(i);
    adjacency[e.to].push(i);
  });
  const component = nodes.map(() => -1);
  let count = 0;
  for (const start of ends) {
    if (component[start] >= 0) continue;
    const stack = [start];
    component[start] = count;
    while (stack.length) {
      const u = stack.pop()!;
      for (const id of adjacency[u]) {
        const e = edges[id],
          v = e.from === u ? e.to : e.from;
        if (component[v] < 0) {
          component[v] = count;
          stack.push(v);
        }
      }
    }
    count++;
  }
  const [a, b, , d] = ends.map((id) => nodes[id].color);
  return {
    nodes,
    edges,
    crossings,
    boxes,
    ends,
    width,
    height,
    component,
    fraction: rational(b - a, b - d),
  };
}
export function diagramClosure(diagram: ReturnType<typeof tangleDiagram>) {
  const { nodes, ends, crossings } = diagram;
  const edges = [
    ...diagram.edges,
    { from: ends[0], to: ends[1], region: -2 },
    { from: ends[2], to: ends[3], region: -2 },
  ];
  const adjacency = nodes.map(() => [] as number[]);
  edges.forEach((e, i) => {
    adjacency[e.from].push(i);
    adjacency[e.to].push(i);
  });
  const directions = new Map<number, number>(),
    components = new Map<number, number>();
  let count = 0;
  for (let seed = 0; seed < edges.length; seed++) {
    if (directions.has(seed)) continue;
    let id = seed,
      from = edges[id].from;
    while (!directions.has(id)) {
      const e = edges[id],
        direction = e.from === from ? 1 : -1;
      directions.set(id, direction);
      components.set(id, count);
      const to = direction === 1 ? e.to : e.from;
      id = adjacency[to].find((i) => i !== id)!;
      from = to;
    }
    count++;
  }
  let writhe = 0,
    linkingSum = 0;
  for (const c of crossings) {
    const vector = (id: number) => {
      const e = edges[id],
        a = nodes[e.from],
        b = nodes[e.to],
        sign = directions.get(id)!;
      return { x: (b.x - a.x) * sign, y: (b.y - a.y) * sign };
    };
    const a = vector(c.over),
      b = vector(c.under),
      sign = Math.sign(-(a.x * b.y - a.y * b.x));
    writhe += sign;
    if (components.get(c.over) !== components.get(c.under)) linkingSum += sign;
  }
  return {
    components: count,
    writhe,
    linking: linkingSum / 2,
    aggregated: diagram.boxes.length > 0,
  };
}
