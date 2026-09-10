import { rect, type PixelOp } from "./map/ops";
import { PALETTE } from "./map/palette";
import { textOps, textWidth } from "./map/pixelfont";

export const TITLE_POS = { x: 250, y: 236 };

export function titleSignOps(): PixelOp[] {
  const l1 = "BIENVENIDO A", l2 = "NICOLAS RICCOMINI";
  const w = Math.max(textWidth(l1), textWidth(l2)) + 6;
  const { x, y } = TITLE_POS;
  return [
    rect(x, y, w, 16, PALETTE.concrete),
    rect(x + w - 9, y, 9, 4, PALETTE.ground), // esquina rota
    rect(x + 4, y + 16, 2, 8, PALETTE.rust), rect(x + w - 6, y + 16, 2, 8, PALETTE.rust), // patas
    ...textOps(l1, x + 3, y + 2, PALETTE.amber),
    ...textOps(l2, x + 3, y + 9, PALETTE.amber),
    // letras caídas al pie
    ...textOps("A", x + w - 14, y + 20, PALETTE.amberMid),
  ];
}
