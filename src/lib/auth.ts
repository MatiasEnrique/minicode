import { createAuthConfig } from "@shared/auth";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { serverEnv } from "@/config/env";
import db from "./db";

export const auth = betterAuth({
	...createAuthConfig({
		db,
		secret: serverEnv.BETTER_AUTH_SECRET,
		baseUrl: serverEnv.BETTER_AUTH_URL,
	}),
	plugins: [tanstackStartCookies()],
});
