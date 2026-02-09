import { z } from "zod";

const clientEnvSchema = z.object({
	VITE_APP_NAME: z.string(),
	VITE_APP_URL: z.url(),
});

export const clientEnv = clientEnvSchema.parse(import.meta.env);
