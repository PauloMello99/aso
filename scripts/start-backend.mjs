import { createRequire } from "module";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "../../");
process.chdir(join(root, "apps/backend"));
process.argv.push("start", "--watch");

createRequire(import.meta.url)(
  join(root, "apps/backend/node_modules/@nestjs/cli/bin/nest.js")
);
