import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoot = process.env.SITES_RUNTIME_ROOT || path.join(projectRoot, ".sites-runtime");

const localEnvPath = path.join(projectRoot, ".env.local");
if (existsSync(localEnvPath)) {
  loadEnvFile(localEnvPath);
  copyFileSync(localEnvPath, path.join(projectRoot, ".dev.vars"));

  // Wrangler resolves .dev.vars relative to the directory containing the
  // explicit config file. The production preview config lives in dist/server,
  // so copy the local variables there as well after a successful build.
  const previewConfigDirectory = path.join(projectRoot, "dist/server");
  if (existsSync(previewConfigDirectory)) {
    copyFileSync(localEnvPath, path.join(previewConfigDirectory, ".dev.vars"));
  }
}

process.env.CLOUDFLARE_CF_FETCH_ENABLED ||= "false";
process.env.WRANGLER_SEND_METRICS ||= "false";
process.env.WRANGLER_WRITE_LOGS ||= "false";
process.env.WRANGLER_LOG_PATH ||= path.join(runtimeRoot, "wrangler/logs");
process.env.WRANGLER_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/dev-registry");
process.env.MINIFLARE_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/registry");

process.chdir(projectRoot);
for (const directory of [
  path.dirname(process.env.WRANGLER_LOG_PATH),
  process.env.WRANGLER_REGISTRY_PATH,
  process.env.MINIFLARE_REGISTRY_PATH,
]) {
  mkdirSync(directory, { recursive: true });
}
