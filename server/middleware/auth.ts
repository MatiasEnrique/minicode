import { createAuthConfig } from "@shared/auth";
import { getDb } from "@shared/db";
import { sharedEnvSchema } from "@shared/env";
import { betterAuth } from "better-auth";
import Elysia from "elysia";

const env = sharedEnvSchema.parse(process.env);

export class UnauthorizedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnauthorizedError";
	}
}
export const isUnauthorizedError = (
	error: unknown,
): error is UnauthorizedError => {
	return error instanceof UnauthorizedError;
};

export const auth = betterAuth({
	...createAuthConfig({
		db: getDb(),
		secret: env.BETTER_AUTH_SECRET,
		baseUrl: env.BETTER_AUTH_URL,
	}),
});

export const requireAuth = new Elysia({ name: "requireAuth" }).derive(
	{ as: "global" },
	async ({ request }) => {
		const authSession = await auth.api.getSession({
			headers: request.headers,
		});

		if (!authSession?.user) {
			throw new UnauthorizedError("Unauthorized");
		}

		return {
			authSession,
			userId: authSession.user.id,
		};
	},
);
