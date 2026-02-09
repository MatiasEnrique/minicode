import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "../db";
import * as schema from "../db/schema";

export interface AuthConfig {
	db: Database;
	secret: string;
	baseUrl: string;
}

export function createAuthConfig({
	db,
	secret,
	baseUrl,
}: AuthConfig): BetterAuthOptions {
	return {
		secret,
		baseURL: baseUrl,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			autoSignIn: true,
		},
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
	};
}
