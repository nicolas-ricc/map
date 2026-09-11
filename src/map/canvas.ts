import { Container, Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { applyOps, type PixelOp } from "./ops";
import { PALETTE } from "./palette";

/** Pinta los ops en una textura nearest. Con `clip`, solo sobrevive lo que cae dentro del polígono. */
export function opsToTexture(renderer: Renderer, ops: PixelOp[], width: number, height: number, clip?: number[]): Texture {
  const root = new Container();
  const g = new Graphics();
  applyOps(g, ops);
  root.addChild(g);
  if (clip) {
    const mask = new Graphics().poly(clip, true).fill(PALETTE.ground); // el color de la máscara no importa
    root.addChild(mask);
    g.mask = mask;
  }
  const rt = RenderTexture.create({ width, height, scaleMode: "nearest", antialias: false });
  rt.source.scaleMode = "nearest";
  renderer.render({ container: root, target: rt, clear: true });
  root.destroy({ children: true });
  return rt;
}
