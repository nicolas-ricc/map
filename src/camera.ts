import { MAP_H, MAP_W } from "./map/zones";

export const ZOOM = 2.5;
export const DURATION_MS = 500;

export interface CameraState { x: number; y: number; scale: number }

export function coverTransform(viewW: number, viewH: number, focus?: { x: number; y: number; zoom: number }): CameraState {
  const cover = Math.max(viewW / MAP_W, viewH / MAP_H);
  if (!focus) {
    return { x: (viewW - MAP_W * cover) / 2, y: (viewH - MAP_H * cover) / 2, scale: cover };
  }
  const scale = cover * focus.zoom;
  return { x: viewW / 2 - focus.x * scale, y: viewH / 2 - focus.y * scale, scale };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Tween { from: CameraState; to: CameraState; start: number | null; resolve: () => void }

export class Camera {
  state: CameraState = { x: 0, y: 0, scale: 1 };
  private tween: Tween | null = null;
  private readonly duration: number;

  constructor(private readonly apply: (s: CameraState) => void, opts: { duration?: number; reducedMotion?: boolean } = {}) {
    this.duration = opts.reducedMotion ? 0 : opts.duration ?? DURATION_MS;
  }

  jumpTo(s: CameraState): void {
    this.finishTween();
    this.state = { ...s };
    this.apply(this.state);
  }

  get isTweening(): boolean { return this.tween !== null; }

  retarget(to: CameraState): void {
    if (this.tween) this.tween.to = { ...to };
  }

  tweenTo(to: CameraState): Promise<void> {
    this.finishTween();
    return new Promise((resolve) => {
      this.tween = { from: { ...this.state }, to: { ...to }, start: null, resolve };
    });
  }

  tick(nowMs: number): void {
    const tw = this.tween;
    if (!tw) return;
    if (tw.start === null) tw.start = nowMs;
    const t = this.duration === 0 ? 1 : Math.min(1, (nowMs - tw.start) / this.duration);
    const k = easeOutCubic(t);
    this.state = {
      x: tw.from.x + (tw.to.x - tw.from.x) * k,
      y: tw.from.y + (tw.to.y - tw.from.y) * k,
      scale: tw.from.scale + (tw.to.scale - tw.from.scale) * k,
    };
    if (t >= 1) this.state = { ...tw.to };
    this.apply(this.state);
    if (t >= 1) { this.tween = null; tw.resolve(); }
  }

  private finishTween(): void {
    if (this.tween) { const r = this.tween.resolve; this.tween = null; r(); }
  }
}
