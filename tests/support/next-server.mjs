import { createRequire } from "node:module";

// Use the real framework response without Node-version-dependent CJS named exports.
const { NextResponse, NextRequest } = createRequire(import.meta.url)("next/server");
export { NextResponse, NextRequest };
