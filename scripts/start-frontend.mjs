import { createRequire } from "module";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "../../");
process.chdir(join(root, "apps/frontend"));
process.argv.push("dev", "--port", "3000");

createRequire(import.meta.url)(
  join(root, "apps/frontend/node_modules/next/dist/bin/next")
);
