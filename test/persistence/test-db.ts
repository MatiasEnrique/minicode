import type { Database } from "@shared/db";
import * as schema from "@shared/db/schema";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const DEFAULT_TEST_DATABASE_URL =
	"postgresql://user:password@localhost:5432/minicode";

type UserRow = typeof schema.user.$inferSelect;
type ProjectRow = typeof schema.projects.$inferSelect;

export interface PersistenceTestContext {
	db: Database;
	migrate: () => Promise<void>;
	reset: () => Promise<void>;
	insertUser: (suffix?: string) => Promise<UserRow>;
	insertProject: (input: {
		userId: string;
		name?: string;
		description?: string | null;
	}) => Promise<ProjectRow>;
	close: () => Promise<void>;
}

export function createPersistenceTestContext(): PersistenceTestContext {
	const connectionString =
		process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
	assertSafeTestDatabaseUrl(connectionString);

	const pool = new Pool({ connectionString });
	const db = drizzle(pool, { schema });

	return {
		db,
		migrate: async () => {
			await migrate(db, { migrationsFolder: "./migrations" });
		},
		reset: async () => {
			await db.execute(sql`
				TRUNCATE TABLE "agent_states", "project_files", "projects", "session", "account", "verification", "user" RESTART IDENTITY CASCADE
			`);
		},
		insertUser: async (suffix = "user") => {
			const id = `${suffix}_${crypto.randomUUID()}`;
			const [row] = await db
				.insert(schema.user)
				.values({
					id,
					name: `${suffix} name`,
					email: `${id}@example.com`,
				})
				.returning();

			return row;
		},
		insertProject: async ({ userId, name = "Project", description = null }) => {
			const [row] = await db
				.insert(schema.projects)
				.values({
					id: `project_${crypto.randomUUID()}`,
					userId,
					name,
					description,
				})
				.returning();

			return row;
		},
		close: async () => {
			await pool.end();
		},
	};
}

function assertSafeTestDatabaseUrl(connectionString: string): void {
	const parsed = new URL(connectionString);
	const isLocalHost =
		parsed.hostname === "localhost" ||
		parsed.hostname === "127.0.0.1" ||
		parsed.hostname === "::1";

	if (!isLocalHost && process.env.ALLOW_NON_LOCAL_TEST_DATABASE !== "true") {
		throw new Error(
			`Refusing to run persistence tests against non-local database host: ${parsed.hostname}`,
		);
	}
}
