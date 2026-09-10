import type { Graphics } from "pixi.js";

export interface PixelOp {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

export function rect(x: number, y: number, w: number, h: number, color: number): PixelOp {
  return { x, y, w, h, color };
}

export function px(x: number, y: number, color: number): PixelOp {
  return { x, y, w: 1, h: 1, color };
}

export function opsBounds(ops: PixelOp[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (ops.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of ops) {
    minX = Math.min(minX, o.x);
    minY = Math.min(minY, o.y);
    maxX = Math.max(maxX, o.x + o.w);
    maxY = Math.max(maxY, o.y + o.h);
  }
  return { minX, minY, maxX, maxY };
}

export function applyOps(g: Graphics, ops: PixelOp[]): void {
  for (const o of ops) g.rect(o.x, o.y, o.w, o.h).fill(o.color);
}
