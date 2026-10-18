import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fakes = new URL("./", import.meta.url);

// Modules that talk to external services are replaced in tests.
const overrides = {
  "@/lib/supabase/server": new URL("fake-supabase.ts", fakes).href,
  "@/lib/auth/clerk-server": new URL("fake-clerk.ts", fakes).href,
  "@/lib/auth/app-user": new URL("fake-app-user.ts", fakes).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (overrides[specifier]) return { url: overrides[specifier], shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const base = root + specifier.slice(2);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (existsSync(candidate) && !candidate.endsWith("/")) {
        try {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        } catch { /* try next */ }
      }
    }
  }
  return nextResolve(specifier, context);
}
