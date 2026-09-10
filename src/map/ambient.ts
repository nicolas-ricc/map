import { Graphics, type Ticker } from "pixi.js";
import { ACCENTS } from "./palette";
import type { ZoneState } from "./zone-node";
import { ZONES, type ZoneId } from "./zones";

const PER_ZONE = 12;

export class Fireflies extends Graphics {
  private t = 0;
  private readonly phases = Array.from({ length: ZONES.length * PER_ZONE }, (_, i) => (i * 0.61803) % 1);

  tick(ticker: Ticker, stateOf: (id: ZoneId) => ZoneState): void {
    this.t += ticker.deltaMS / 1000;
    this.clear();
    ZONES.forEach((z, zi) => {
      const color = ACCENTS[z.accent].core;
      const state = stateOf(z.id);
      const alpha = state === "hot" || state === "active" ? 0.9 : state === "dim" ? 0 : 0.3;
      if (alpha === 0) return;
      for (let i = 0; i < PER_ZONE; i++) {
        const ph = this.phases[zi * PER_ZONE + i]! * Math.PI * 2;
        const a = this.t * 0.5 + ph;
        const x = Math.round(z.landmark.x + Math.cos(a) * 14 + Math.sin(a * 2.3) * 3);
        const y = Math.round(z.landmark.y - 10 + Math.sin(a) * 8 + Math.cos(a * 1.7) * 2);
        const blink = 0.5 + 0.5 * Math.sin(this.t * 3 + ph * 4);
        this.rect(x, y, 1, 1).fill({ color, alpha: alpha * blink });
      }
    });
  }
}
