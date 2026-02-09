import { getDb } from "@shared/db";
import Elysia, { t } from "elysia";
import { requireAuth } from "server/middleware/auth";
import { ProjectFilesRepository } from "server/services/project-files-repository";

export const projectFilesRoute = new Elysia({ prefix: "/api/project-files" })
	.use(requireAuth)
	.get(
		"/:projectId",
		async ({ params, userId }) => {
			const projectFiles = await new ProjectFilesRepository(
				getDb(),
			).listByProjectForUser(params.projectId, userId);

			return projectFiles;
		},
		{ params: t.Object({ projectId: t.String() }) },
	)
	.get(
		"/:projectId/:fileId",
		async ({ params, userId, status }) => {
			const projectFile = await new ProjectFilesRepository(
				getDb(),
			).getByProjectIdAndFileIdForUser(params.projectId, params.fileId, userId);
			if (!projectFile) {
				return status(404, "Project file not found");
			}

			return projectFile;
		},
		{ params: t.Object({ projectId: t.String(), fileId: t.String() }) },
	)
	.put(
		"/:projectId",
		async ({ params, body, userId, status }) => {
			const projectFile = await new ProjectFilesRepository(getDb()).upsertFile({
				id: crypto.randomUUID(),
				projectId: params.projectId,
				path: body.path,
				content: body.content,
				userId,
			});

			if (!projectFile) {
				return status(404, "Project file not found");
			}

			return projectFile;
		},
		{
			params: t.Object({ projectId: t.String() }),
			body: t.Object({ path: t.String(), content: t.String() }),
		},
	);
