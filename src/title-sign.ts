import { rect, type PixelOp } from "./map/ops";
import { PALETTE } from "./map/palette";
import { textOps, textWidth } from "./map/pixelfont";

export const TITLE_POS = { x: 250, y: 236 };

export function titleSignOps(): PixelOp[] {
  const l1 = "NICOLAS RICCOMINI";
  const w = textWidth(l1) + 6;
  const { x, y } = TITLE_POS;
  return [
    rect(x, y, w, 9, PALETTE.concrete),
    rect(x + w - 7, y, 7, 3, PALETTE.ground), // esquina rota
    rect(x + 4, y + 9, 2, 8, PALETTE.rust), rect(x + w - 6, y + 9, 2, 8, PALETTE.rust), // patas
    ...textOps(l1, x + 3, y + 2, PALETTE.amber),
    // letra caída al pie
    ...textOps("I", x + w - 12, y + 13, PALETTE.amberMid),
  ];
}
