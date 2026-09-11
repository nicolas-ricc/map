import { AnimatedSprite, Container, Sprite, type Texture, type Ticker } from "pixi.js";
import { DIM_BRIGHTNESS, FLICKER_MS, IDLE_BRIGHTNESS, brightnessTint, flickerBrightness } from "./brightness";
import { GLOW_H } from "./landmarks";
import { pointInPolygon, type ZoneDef, type ZoneId } from "./zones";

export type ZoneState = "idle" | "hot" | "active" | "dim";

export interface ZoneTextures { terrain: Texture; frames: Texture[]; glow: Texture; label: Texture; overlay: Texture }

interface BoxHitArea { x: number; y: number; width: number; height: number; contains(x: number, y: number): boolean }

/**
 * Pixi usa `contains()` para el puntero y `x/y/width/height` para ubicar el div de
 * accesibilidad. Un `Polygon` no expone esos campos (y leerlos dispara deprecations
 * en 8.20), así que combinamos el bounding box con el test poligonal exacto.
 */
function polygonHitArea(points: number[]): BoxHitArea {
  const xs = points.filter((_, i) => i % 2 === 0);
  const ys = points.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {
    x, y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
    contains: (px, py) => pointInPolygon(px, py, points),
  };
}

export class ZoneNode extends Container {
  private _state: ZoneState = "idle";
  private brightness = IDLE_BRIGHTNESS;
  private hotElapsedMs = 0;
  private idleElapsedMs = 0;
  private nextIdleFlicker = 0;
  private readonly terrain: Sprite;
  private readonly overlay: Sprite;
  private readonly glow: Sprite;
  private readonly landmark: AnimatedSprite;

  constructor(readonly def: ZoneDef, tex: ZoneTextures, onSelect: (id: ZoneId) => void) {
    super();
    this.terrain = new Sprite(tex.terrain);
    this.overlay = new Sprite(tex.overlay);
    this.glow = new Sprite({ texture: tex.glow, anchor: { x: 0.5, y: 0.5 }, blendMode: "add", alpha: 0.25 });
    this.glow.position.set(def.landmark.x, def.landmark.y - GLOW_H / 6); // charco de luz al pie del edificio
    this.landmark = new AnimatedSprite({ textures: tex.frames, autoUpdate: false });
    this.landmark.anchor.set(0.5, 1);
    this.landmark.position.set(def.landmark.x, def.landmark.y);
    this.landmark.animationSpeed = 8 / 60;
    // el nombre nunca se tiñe: se lee aunque el tercio esté apagado
    const label = new Sprite(tex.label);
    label.position.set(def.label.x, def.label.y);
    this.addChild(this.terrain, this.overlay, this.glow, this.landmark, label);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = polygonHitArea(def.polygon);
    this.accessible = true;
    this.accessibleTitle = def.name;
    this.accessibleHint = `Ir a ${def.name}`;
    this.accessibleType = "button";

    const hot = (): void => { if (this._state === "idle") this.setState("hot"); };
    const cool = (): void => { if (this._state === "hot") this.setState("idle"); };
    this.on("pointerover", hot).on("mouseover", hot);
    this.on("pointerout", cool).on("mouseout", cool);
    this.on("pointertap", () => onSelect(def.id));
    this.applyBrightness();
  }

  get state(): ZoneState { return this._state; }

  setState(s: ZoneState): void {
    if (s === this._state) return;
    this._state = s;
    if (s === "hot") this.hotElapsedMs = 0;
    if (s === "hot" || s === "active") this.landmark.play();
    else this.landmark.gotoAndStop(0);
    this.eventMode = s === "dim" ? "none" : "static";
    // una zona apagada tampoco debe recibir foco de teclado: sería un botón inerte
    this.accessible = s !== "dim";
  }

  /**
   * `shaded`: otro tercio tiene el hover. Este se oscurece como si estuviera
   * apagado pero sigue siendo clickeable.
   */
  tick(ticker: Ticker, shaded = false): void {
    let target: number;
    switch (this._state) {
      case "hot":
        this.hotElapsedMs += ticker.deltaMS;
        target = flickerBrightness(this.hotElapsedMs);
        break;
      case "active": target = 1; break;
      case "dim": target = DIM_BRIGHTNESS; break;
      default: target = shaded ? DIM_BRIGHTNESS : this.idleWithFlicker(ticker.deltaMS);
    }
    // lerp suave salvo durante el flicker, que es instantáneo
    const instant = this._state === "hot" && this.hotElapsedMs < FLICKER_MS;
    this.brightness = instant ? target : this.brightness + (target - this.brightness) * Math.min(1, ticker.deltaMS / 120);
    this.applyBrightness();
    const lit = this._state === "hot" || this._state === "active";
    const glowTarget = lit ? 0.9 : this._state === "dim" || shaded ? 0 : 0.25;
    this.glow.alpha += (glowTarget - this.glow.alpha) * Math.min(1, ticker.deltaMS / 120);
    if (lit) this.landmark.update(ticker);
  }

  private idleWithFlicker(deltaMS: number): number {
    this.idleElapsedMs += deltaMS;
    if (this.nextIdleFlicker === 0) this.nextIdleFlicker = this.idleElapsedMs + 5000 + Math.random() * 10000;
    if (this.idleElapsedMs > this.nextIdleFlicker) {
      if (this.idleElapsedMs > this.nextIdleFlicker + 80) this.nextIdleFlicker = this.idleElapsedMs + 5000 + Math.random() * 10000;
      return 0.3;
    }
    return IDLE_BRIGHTNESS;
  }

  private applyBrightness(): void {
    const t = brightnessTint(this.brightness);
    this.terrain.tint = t;
    this.overlay.tint = t;
    this.landmark.tint = t;
  }
}
