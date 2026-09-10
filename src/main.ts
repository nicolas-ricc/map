import { Application, type AccessibilitySystemOptions, type ApplicationOptions } from "pixi.js";
import blogJson from "../content/blog.json";
import cvJson from "../content/cv.json";
import portfolioJson from "../content/portfolio.json";
import feed from "../content/blog.generated.json";
import { Camera, ZOOM, coverTransform } from "./camera";
import { mergeBlogFeed } from "./content/blog-feed";
import { renderContent } from "./content/render";
import type { ZoneContent } from "./content/types";
import { buildWorld } from "./map/build-world";
import { ZONE_IDS, zoneById, type ZoneId } from "./map/zones";
import { pathForZone, zoneFromPath } from "./router";
import { showMap, showZone } from "./views";

const CONTENT: Record<ZoneId, ZoneContent> = {
  portfolio: portfolioJson as ZoneContent,
  cv: cvJson as ZoneContent,
  blog: mergeBlogFeed(blogJson as ZoneContent, feed.items),
};

async function boot(): Promise<void> {
  const host = document.getElementById("canvas-host") as HTMLDivElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const app = new Application();
  // enabledByDefault: en Pixi 8.20 el listener de Tab solo se engancha dentro de
  // _activate(), así que sin esto la capa de accesibilidad nunca arranca.
  // (accessibilityOptions no está en el tipo de app.init; se compone aparte.)
  const initOptions: Partial<ApplicationOptions> & AccessibilitySystemOptions = {
    resizeTo: host, background: 0x0b1620, antialias: false, resolution: 1, roundPixels: true,
    accessibilityOptions: { enabledByDefault: true },
  };
  await app.init(initOptions);
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  let current: ZoneId | null = zoneFromPath(location.pathname);

  const world = buildWorld(app.renderer, (id) => navigate(id, true));
  app.stage.addChild(world.container);

  const camera = new Camera((s) => { world.container.position.set(s.x, s.y); world.container.scale.set(s.scale); }, { reducedMotion: reduced });

  const targetFor = (id: ZoneId | null) => {
    const w = host.clientWidth, h = host.clientHeight;
    return id ? coverTransform(w, h, { ...zoneById(id).landmark, zoom: ZOOM }) : coverTransform(w, h);
  };

  const applyStates = (id: ZoneId | null): void => {
    for (const z of ZONE_IDS) world.zones[z].setState(id === null ? "idle" : z === id ? "active" : "dim");
  };

  function render(id: ZoneId | null, animate: boolean): void {
    applyStates(id);
    if (id) {
      const prerendered = document.body.dataset.zone === id && document.getElementById("content")!.childElementCount > 0;
      showZone(id, zoneById(id).name, prerendered ? null : renderContent(CONTENT[id]));
    } else {
      showMap();
    }
    const t = targetFor(id);
    if (animate) void camera.tweenTo(t); else camera.jumpTo(t);
  }

  function navigate(id: ZoneId | null, push: boolean): void {
    current = id;
    if (push) history.pushState({ zone: id }, "", pathForZone(id));
    render(id, true);
  }

  // El host cambia de tamaño por CSS durante la transición: seguirlo frame a frame.
  new ResizeObserver(() => {
    app.resize();
    const t = targetFor(current);
    if (camera.isTweening) camera.retarget(t); else camera.jumpTo(t);
  }).observe(host);

  window.addEventListener("popstate", () => { current = zoneFromPath(location.pathname); render(current, true); });
  document.getElementById("back")!.addEventListener("click", (e) => { e.preventDefault(); navigate(null, true); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) navigate(null, true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) app.ticker.stop(); else app.ticker.start(); });

  app.ticker.add((ticker) => { camera.tick(performance.now()); world.tick(ticker); });

  render(current, false);
}

boot();
