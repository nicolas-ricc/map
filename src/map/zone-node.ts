import { AnimatedSprite, Container, Polygon, Sprite, type Texture, type Ticker } from "pixi.js";
import { DIM_BRIGHTNESS, IDLE_BRIGHTNESS, brightnessTint, flickerBrightness } from "./brightness";
import { GLOW_H } from "./landmarks";
import type { ZoneDef, ZoneId } from "./zones";

export type ZoneState = "idle" | "hot" | "active" | "dim";

export interface ZoneTextures { frames: Texture[]; glow: Texture; label: Texture; overlay: Texture }

export class ZoneNode extends Container {
  private _state: ZoneState = "idle";
  private brightness = IDLE_BRIGHTNESS;
  private hotSince = 0;
  private nextIdleFlicker = 0;
  private readonly overlay: Sprite;
  private readonly glow: Sprite;
  private readonly landmark: AnimatedSprite;
  private readonly labelSprite: Sprite;

  constructor(readonly def: ZoneDef, tex: ZoneTextures, onSelect: (id: ZoneId) => void) {
    super();
    this.overlay = new Sprite(tex.overlay);
    this.glow = new Sprite({ texture: tex.glow, anchor: { x: 0.5, y: 0.5 }, blendMode: "add", alpha: 0.25 });
    this.glow.position.set(def.landmark.x, def.landmark.y - GLOW_H / 4);
    this.landmark = new AnimatedSprite({ textures: tex.frames, autoUpdate: false });
    this.landmark.anchor.set(0.5, 1);
    this.landmark.position.set(def.landmark.x, def.landmark.y);
    this.landmark.animationSpeed = 8 / 60;
    this.labelSprite = new Sprite(tex.label);
    this.labelSprite.position.set(def.label.x, def.label.y);
    this.addChild(this.overlay, this.glow, this.landmark, this.labelSprite);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Polygon(def.polygon);
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
    if (s === "hot") this.hotSince = performance.now();
    if (s === "hot" || s === "active") this.landmark.play();
    else this.landmark.gotoAndStop(0);
    this.eventMode = s === "dim" ? "none" : "static";
  }

  tick(ticker: Ticker): void {
    const now = performance.now();
    let target: number;
    switch (this._state) {
      case "hot": target = flickerBrightness(now - this.hotSince); break;
      case "active": target = 1; break;
      case "dim": target = DIM_BRIGHTNESS; break;
      default: target = this.idleWithFlicker(now);
    }
    // lerp suave salvo durante el flicker, que es instantáneo
    const instant = this._state === "hot" && now - this.hotSince < 250;
    this.brightness = instant ? target : this.brightness + (target - this.brightness) * Math.min(1, ticker.deltaMS / 120);
    this.applyBrightness();
    if (this._state === "hot" || this._state === "active") this.landmark.update(ticker);
  }

  private idleWithFlicker(now: number): number {
    if (this.nextIdleFlicker === 0) this.nextIdleFlicker = now + 5000 + Math.random() * 10000;
    if (now > this.nextIdleFlicker) {
      if (now > this.nextIdleFlicker + 80) this.nextIdleFlicker = now + 5000 + Math.random() * 10000;
      return 0.3;
    }
    return IDLE_BRIGHTNESS;
  }

  private applyBrightness(): void {
    const t = brightnessTint(this.brightness);
    this.overlay.tint = t;
    this.landmark.tint = t;
    this.labelSprite.tint = t;
    const glowTarget = this._state === "hot" || this._state === "active" ? 0.9 : this._state === "dim" ? 0 : 0.25;
    this.glow.alpha += (glowTarget - this.glow.alpha) * 0.15;
  }
}
