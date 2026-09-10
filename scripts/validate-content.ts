import { readFileSync } from "node:fs";
import { validateContent } from "../src/content/validate";
import { ZONE_IDS } from "../src/map/zones";

let failed = false;
for (const id of ZONE_IDS) {
  const path = `content/${id}.json`;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    failed = true;
    console.error(`${path}: JSON inválido — ${e instanceof Error ? e.message : String(e)}`);
    continue;
  }
  const errs = validateContent(data);
  if (errs.length) { failed = true; console.error(`${path}:\n  ${errs.join("\n  ")}`); }
}
if (failed) process.exit(1);
console.log("content: ok");
