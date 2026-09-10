import { readFileSync } from "node:fs";
import { validateContent } from "../src/content/validate";
import { ZONE_IDS } from "../src/map/zones";

let failed = false;
for (const id of ZONE_IDS) {
  const path = `content/${id}.json`;
  const errs = validateContent(JSON.parse(readFileSync(path, "utf8")));
  if (errs.length) { failed = true; console.error(`${path}:\n  ${errs.join("\n  ")}`); }
}
if (failed) process.exit(1);
console.log("content: ok");
