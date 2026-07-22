import { config } from "dotenv";
import path from "path";

// Prisma v7 no longer loads .env files automatically. Load .env.local to match
// Next.js's own convention (real local secrets live in .env.local, gitignored).
config({ path: path.join(__dirname, ".env.local") });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The installed @prisma/config (7.9.0) only supports `url`/`shadowDatabaseUrl`
    // here — no `directUrl` (older Prisma docs mention one, but it's not in this
    // version's actual type, confirmed via node_modules/@prisma/config/dist/index.d.ts).
    // The Prisma CLI (migrate/introspect) needs Neon's direct/unpooled connection
    // for advisory locks, so it reads DIRECT_URL. The app's own runtime client
    // (lib/prisma.ts) reads DATABASE_URL (pooled) independently via the adapter —
    // same practical effect as the old two-URL setup, via two separately-named vars.
    url: env("DIRECT_URL"),
  },
});
