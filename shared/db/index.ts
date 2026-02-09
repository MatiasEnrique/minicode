import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
	return drizzle(databaseUrl, { schema });
}

export type Database = ReturnType<typeof createDb>;

let _db: Database | null = null;

export function getDb(): Database {
	if (!_db) {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is not set");
		}
		_db = createDb(databaseUrl);
	}
	return _db;
}

export { _db as db };

export * from "./schema";
