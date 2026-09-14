import type { Accent } from "../iso/accent";
import type { Solid } from "../iso/solids";

/**
 * Contrato entre una escena animada y el runtime, sin Pixi: cada id nombra
 * una capa propia (un par sombra/sólido, una Graphics de acentos o una de
 * agua) y `tick` dice cuáles hay que redibujar.
 */
export type AnimLayer =
  | { kind: "solid"; solids: Solid[] }
  | { kind: "accent"; accents: Accent[] }
  | { kind: "water"; water: Solid[] };

export interface Animator {
  readonly ids: readonly string[];
  layer(id: string): AnimLayer;
  tick(dtMs: number): ReadonlySet<string>;
}
