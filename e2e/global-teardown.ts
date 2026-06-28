import "dotenv/config";
import pg from "pg";
import { E2E_MARKER } from "./helpers";

/**
 * After the whole e2e run, delete every project created by the tests. Projects are
 * tagged with E2E_MARKER in their name (see `createProject`), so this is scoped to
 * test data only — it can never touch the user's real (unmarked) projects.
 * Cascades remove the projects' deliverables, subtasks, status updates, etc.
 */
export default async function globalTeardown() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query(
      'DELETE FROM "Project" WHERE name LIKE $1 RETURNING id',
      [E2E_MARKER + "%"]
    );
    console.log(`\n[e2e teardown] deleted ${res.rowCount} test project(s).`);
  } catch (e) {
    console.error("[e2e teardown] cleanup failed:", (e as Error).message);
  } finally {
    await client.end().catch(() => {});
  }
}
