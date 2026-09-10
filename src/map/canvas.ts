import { Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { applyOps, type PixelOp } from "./ops";

export function opsToTexture(renderer: Renderer, ops: PixelOp[], width: number, height: number): Texture {
  const g = new Graphics();
  applyOps(g, ops);
  const rt = RenderTexture.create({ width, height, scaleMode: "nearest", antialias: false });
  rt.source.scaleMode = "nearest";
  renderer.render({ container: g, target: rt, clear: true });
  g.destroy();
  return rt;
}
