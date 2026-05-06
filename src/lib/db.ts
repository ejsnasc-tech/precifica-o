import { getCloudflareContext } from "@opennextjs/cloudflare";

let localDB: D1Database | null = null;

async function getLocalDB(): Promise<D1Database> {
  if (localDB) return localDB;

  const Database = (await import("better-sqlite3")).default;
  const fs = await import("fs");
  const path = await import("path");

  const dbPath = path.join(process.cwd(), ".dev.db");
  const sqlite = new Database(dbPath);

  sqlite.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)`);
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const already = sqlite.prepare("SELECT name FROM _migrations WHERE name = ?").get(file);
    if (!already) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    }
  }

  localDB = {
    prepare: (query: string) => {
      const stmt = sqlite.prepare(query);
      return {
        bind: (...params: unknown[]) => ({
          first: async <T>() => stmt.get(...params) as T | null,
          all: async <T>() => ({ results: stmt.all(...params) as T[] }),
          run: async () => {
            const info = stmt.run(...params);
            return { meta: { last_row_id: info.lastInsertRowid } };
          },
        }),
        first: async <T>() => stmt.get() as T | null,
        all: async <T>() => ({ results: stmt.all() as T[] }),
        run: async () => {
          const info = stmt.run();
          return { meta: { last_row_id: info.lastInsertRowid } };
        },
      };
    },
  } as unknown as D1Database;

  return localDB;
}

export async function getDB(): Promise<D1Database> {
  if (process.env.NODE_ENV === "development") {
    return getLocalDB();
  }
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}
