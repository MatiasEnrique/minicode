import { Elysia } from "elysia";
import { isUnauthorizedError } from "./middleware/auth";
import { projectFilesRoute } from "./routes/project-files";
import { projectsRoute } from "./routes/projects";
import { websocketHandler } from "./websocket/handler";

export const app = new Elysia()
	.onError(({ error, set }) => {
		if (isUnauthorizedError(error)) {
			set.status = 401;
			return "Unauthorized";
		}
	})
	.get("/", () => ({ message: "Minicode Server", status: "ok" }))
	.get("/health", () => ({ status: "healthy" }))
	.use(projectFilesRoute)
	.use(projectsRoute)
	.use(websocketHandler)
	.listen(3001);
