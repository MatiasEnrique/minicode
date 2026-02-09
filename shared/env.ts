import { z } from "zod";

export const sharedEnvSchema = z.object({
	DATABASE_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;
