import { createAuthClient } from "better-auth/react";
import { clientEnv } from "@/config/env.client";

export const { signIn, signOut, signUp, useSession } = createAuthClient({
	baseURL: clientEnv.VITE_APP_URL,
});
