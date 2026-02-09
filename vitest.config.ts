import { fileURLToPath, URL } from "node:url";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@shared": fileURLToPath(new URL("./shared", import.meta.url)),
		},
	},
	plugins: [
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
	],
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
		fileParallelism: false,
	},
});
