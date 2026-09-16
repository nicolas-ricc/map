export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z);
  return len === 0 ? { x: 0, y: 0, z: 0 } : { x: a.x / len, y: a.y / len, z: a.z / len };
}

/** Normal por el método de Newell: funciona para polígonos no planos y de cualquier tamaño. */
export function polygonNormal(pts: Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    x += (a.y - b.y) * (a.z + b.z);
    y += (a.z - b.z) * (a.x + b.x);
    z += (a.x - b.x) * (a.y + b.y);
  }
  return normalize({ x, y, z });
}

export function centroid(pts: Vec3[]): Vec3 {
  const n = pts.length || 1;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

/** Casco convexo (monotone chain). Sin puntos colineales en el borde. */
export function convexHull(input: Vec2[]): Vec2[] {
  const pts = [...input].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export interface PolySeg { a: Vec3; b: Vec3; len: number; heading: number }
/** Punto de la polilínea: posición, rumbo del tramo y su índice. */
export interface PolyPoint { x: number; y: number; z: number; heading: number; seg: number }
export interface Polyline { segs: readonly PolySeg[]; length: number; at(d: number): PolyPoint }

/**
 * Camina una polilínea: tramos con largo (en planta, x/y) y rumbo, largo
 * total y el punto a `d` unidades del inicio (z interpolada, 0 si los puntos
 * son `Vec2`). `at` recorta `d` a `[0, length]`: quien quiera dar la vuelta o
 * rebotar lo hace antes de llamar. En el límite entre dos tramos manda el
 * anterior (t = 1), así el índice no salta antes de tiempo. Para cerrar un
 * circuito, pasar el primer punto otra vez al final.
 */
export function polyline(pts: readonly (Vec2 | Vec3)[]): Polyline {
  const p = pts.map((q) => v3(q.x, q.y, (q as Partial<Vec3>).z ?? 0));
  const segs: PolySeg[] = p.slice(1).map((b, i) => {
    const a = p[i]!;
    return { a, b, len: Math.hypot(b.x - a.x, b.y - a.y), heading: Math.atan2(b.y - a.y, b.x - a.x) };
  });
  const cum = segs.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s.len], [0]);
  const length = cum[cum.length - 1] ?? 0;
  const at = (dist: number): PolyPoint => {
    const first = p[0] ?? v3(0, 0, 0);
    if (segs.length === 0) return { x: first.x, y: first.y, z: first.z, heading: 0, seg: 0 };
    const d = Math.max(0, Math.min(length, dist));
    let i = 0;
    while (i < segs.length - 1 && d > cum[i + 1]!) i++;
    const s = segs[i]!, t = s.len === 0 ? 0 : (d - cum[i]!) / s.len;
    return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, z: s.a.z + (s.b.z - s.a.z) * t, heading: s.heading, seg: i };
  };
  return { segs, length, at };
}
