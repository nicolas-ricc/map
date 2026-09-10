import { Application } from "pixi.js";

async function boot(): Promise<void> {
  const host = document.getElementById("canvas-host") as HTMLDivElement;
  const app = new Application();
  await app.init({ resizeTo: host, background: 0x0b1620, antialias: false, resolution: 1, roundPixels: true });
  host.appendChild(app.canvas);
}

boot();
