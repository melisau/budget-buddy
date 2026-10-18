// Lets `node --test` load app modules that use the "@/..." path alias, and
// swaps external services (Supabase database and Auth) for in-memory fakes. Only used by
// the test runner; the app build is unaffected.
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
