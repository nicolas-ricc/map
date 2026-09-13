// src/iso/solids.ts
import type { Material, Tone } from "../map/palette-iso";
import { centroid, dot, polygonNormal, type Vec2, type Vec3, v3 } from "./geometry";
import { shadeTone } from "./light";
import { VIEW_DIR } from "./project";

export interface Tri { pts: [Vec3, Vec3, Vec3]; toneOffset?: number }

export type Solid =
  | { kind: "prism"; at: Vec3; w: number; d: number; h: number; mat: Material; roof?: "flat" | "gable" | "step" }
  | { kind: "ramp"; at: Vec3; w: number; d: number; h: number; mat: Material; dir: "e" | "w" }
  | { kind: "cylinder"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "cone"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material }
  | { kind: "strip"; path: Vec2[]; width: number; z: number; mat: Material }
  | { kind: "ground"; tris: Tri[]; mat: Material };

export interface Face { pts: Vec3[]; normal: Vec3; mat: Material; tone: Tone; toneOffset: number }

export const GABLE_RATIO = 0.35; // altura de cumbrera sobre alero, relativa a la altura de la caja
export const STEP_RATIO = 0.35;  // altura del segundo nivel del techo escalonado
export const STEP_INSET = 0.2;   // retranqueo del segundo nivel, relativo al lado

export function isFlat(s: Solid): boolean {
  return s.kind === "strip" || s.kind === "ground";
}

/** Cara con la normal orientada hacia afuera del centro `c` del sólido. */
function face(pts: Vec3[], mat: Material, c: Vec3, toneOffset = 0): Face {
  let normal = polygonNormal(pts);
  const fc = centroid(pts);
  if (dot(normal, { x: fc.x - c.x, y: fc.y - c.y, z: fc.z - c.z }) < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
  return { pts, normal, mat, tone: shadeTone(normal), toneOffset };
}

/** Prisma recto sobre una huella poligonal: techo, base y un cuadrilátero por lado. */
function extrude(footprint: Vec2[], z0: number, h: number, mat: Material): Face[] {
  const top = footprint.map((p) => v3(p.x, p.y, z0 + h));
  const bottom = footprint.map((p) => v3(p.x, p.y, z0));
  const c = centroid([...top, ...bottom]);
  const out = [face(top, mat, c), face(bottom, mat, c)];
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i]!, b = footprint[(i + 1) % footprint.length]!;
    out.push(face([v3(a.x, a.y, z0), v3(b.x, b.y, z0), v3(b.x, b.y, z0 + h), v3(a.x, a.y, z0 + h)], mat, c));
  }
  return out;
}

const rect = (x: number, y: number, w: number, d: number): Vec2[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];

function regular(cx: number, cy: number, r: number, sides: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / sides; // caras planas al norte/sur/este/oeste
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function gable(at: Vec3, w: number, d: number, h: number, mat: Material): Face[] {
  const { x, y, z } = at;
  const eave = z + h, ridge = eave + h * GABLE_RATIO;
  const c = v3(x + w / 2, y + d / 2, z + h / 2);
  const f = (pts: Vec3[]) => face(pts, mat, c);
  if (w >= d) {
    const ym = y + d / 2;
    return [
      f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),                          // base
      f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y, eave), v3(x, y, eave)]),                             // pared norte
      f([v3(x, y + d, z), v3(x + w, y + d, z), v3(x + w, y + d, eave), v3(x, y + d, eave)]),             // pared sur
      f([v3(x, y, z), v3(x, y, eave), v3(x, ym, ridge), v3(x, y + d, eave), v3(x, y + d, z)]),           // hastial oeste
      f([v3(x + w, y, z), v3(x + w, y, eave), v3(x + w, ym, ridge), v3(x + w, y + d, eave), v3(x + w, y + d, z)]), // hastial este
      f([v3(x, y, eave), v3(x + w, y, eave), v3(x + w, ym, ridge), v3(x, ym, ridge)]),                   // vertiente norte
      f([v3(x, y + d, eave), v3(x + w, y + d, eave), v3(x + w, ym, ridge), v3(x, ym, ridge)]),           // vertiente sur
    ];
  }
  const xm = x + w / 2;
  return [
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),
    f([v3(x, y, z), v3(x, y + d, z), v3(x, y + d, eave), v3(x, y, eave)]),                               // pared oeste
    f([v3(x + w, y, z), v3(x + w, y + d, z), v3(x + w, y + d, eave), v3(x + w, y, eave)]),               // pared este
    f([v3(x, y, z), v3(x, y, eave), v3(xm, y, ridge), v3(x + w, y, eave), v3(x + w, y, z)]),             // hastial norte
    f([v3(x, y + d, z), v3(x, y + d, eave), v3(xm, y + d, ridge), v3(x + w, y + d, eave), v3(x + w, y + d, z)]), // hastial sur
    f([v3(x, y, eave), v3(x, y + d, eave), v3(xm, y + d, ridge), v3(xm, y, ridge)]),                     // vertiente oeste
    f([v3(x + w, y, eave), v3(x + w, y + d, eave), v3(xm, y + d, ridge), v3(xm, y, ridge)]),             // vertiente este
  ];
}

function ramp(at: Vec3, w: number, d: number, h: number, dir: "e" | "w", mat: Material): Face[] {
  const { x, y, z } = at;
  const zw = dir === "e" ? z + h : z, ze = dir === "e" ? z : z + h; // altura del borde oeste / este
  const c = v3(x + w / 2, y + d / 2, z + h / 4);
  const f = (pts: Vec3[]) => face(pts, mat, c);
  return [
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),           // base
    f([v3(x, y, zw), v3(x + w, y, ze), v3(x + w, y + d, ze), v3(x, y + d, zw)]),       // plano inclinado
    f([v3(x, y, z), v3(x, y + d, z), v3(x, y + d, zw), v3(x, y, zw)]),                 // pared oeste
    f([v3(x + w, y, z), v3(x + w, y + d, z), v3(x + w, y + d, ze), v3(x + w, y, ze)]), // pared este
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y, ze), v3(x, y, zw)]),                 // lado norte
    f([v3(x, y + d, z), v3(x + w, y + d, z), v3(x + w, y + d, ze), v3(x, y + d, zw)]), // lado sur
  ];
}

function cone(at: Vec3, r: number, h: number, sides: number, mat: Material): Face[] {
  const base = regular(at.x, at.y, r, sides);
  const apex = v3(at.x, at.y, at.z + h);
  const c = v3(at.x, at.y, at.z + h / 3);
  const out = [face(base.map((p) => v3(p.x, p.y, at.z)), mat, c)];
  for (let i = 0; i < sides; i++) {
    const a = base[i]!, b = base[(i + 1) % sides]!;
    out.push(face([v3(a.x, a.y, at.z), v3(b.x, b.y, at.z), apex], mat, c));
  }
  return out;
}

function hullFootprint(at: Vec3, len: number, beam: number): Vec2[] {
  const half = beam / 2, shoulder = at.x + len * 0.7;
  return [{ x: at.x, y: at.y - half }, { x: shoulder, y: at.y - half }, { x: at.x + len, y: at.y }, { x: shoulder, y: at.y + half }, { x: at.x, y: at.y + half }];
}

function strip(path: Vec2[], width: number, z: number, mat: Material): Face[] {
  const out: Face[] = [];
  const hw = width / 2;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!, b = path[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * hw, ny = ((b.x - a.x) / len) * hw;
    const pts = [v3(a.x + nx, a.y + ny, z), v3(b.x + nx, b.y + ny, z), v3(b.x - nx, b.y - ny, z), v3(a.x - nx, a.y - ny, z)];
    out.push({ pts, normal: v3(0, 0, 1), mat, tone: "top", toneOffset: 0 });
  }
  return out;
}

function ground(tris: Tri[], mat: Material): Face[] {
  return tris.map((t) => {
    let normal = polygonNormal(t.pts);
    if (normal.z < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    return { pts: t.pts, normal, mat, tone: shadeTone(normal), toneOffset: t.toneOffset ?? 0 };
  });
}

export function tessellateAll(s: Solid): Face[] {
  switch (s.kind) {
    case "prism": {
      if (s.roof === "gable") return gable(s.at, s.w, s.d, s.h, s.mat);
      const box = extrude(rect(s.at.x, s.at.y, s.w, s.d), s.at.z, s.h, s.mat);
      if (s.roof !== "step") return box;
      const ix = s.w * STEP_INSET, iy = s.d * STEP_INSET;
      return [...box, ...extrude(rect(s.at.x + ix, s.at.y + iy, s.w - 2 * ix, s.d - 2 * iy), s.at.z + s.h, s.h * STEP_RATIO, s.mat)];
    }
    case "ramp": return ramp(s.at, s.w, s.d, s.h, s.dir, s.mat);
    case "cylinder": return extrude(regular(s.at.x, s.at.y, s.r, s.sides ?? 8), s.at.z, s.h, s.mat);
    case "cone": return cone(s.at, s.r, s.h, s.sides ?? 6, s.mat);
    case "hull": return extrude(hullFootprint(s.at, s.len, s.beam), s.at.z, s.h, s.mat);
    case "strip": return strip(s.path, s.width, s.z, s.mat);
    case "ground": return ground(s.tris, s.mat);
  }
}

/** Solo lo que mira a la cámara. Suelo y franjas se emiten enteros. */
export function tessellate(s: Solid): Face[] {
  const all = tessellateAll(s);
  return isFlat(s) ? all : all.filter((f) => dot(f.normal, VIEW_DIR) > 0);
}
