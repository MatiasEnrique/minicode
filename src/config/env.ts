import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	// Optional until generator integration lands (roadmap phases 5-6).
	OPENROUTER_API_KEY: z.string().min(1).optional(),
	NODE_ENV: z.enum(["development", "production", "test"]),
});

export const serverEnv = envSchema.parse(process.env);
