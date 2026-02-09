import { getDb } from "@shared/db";
import Elysia, { t } from "elysia";
import { requireAuth } from "server/middleware/auth";
import { ProjectsRepository } from "server/services/projects-repository";

export const projectsRoute = new Elysia({ prefix: "/api/projects" })
	.use(requireAuth)
	.get("/", async ({ userId }) => {
		const projects = await new ProjectsRepository(getDb()).listByUserId(userId);
		return projects;
	})
	.get(
		"/:id",
		async ({ params, userId, status }) => {
			const project = await new ProjectsRepository(getDb()).getByIdForUser(
				params.id,
				userId,
			);

			if (!project) {
				return status(404, "Project not found");
			}

			return project;
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.post(
		"/",
		async ({ body, userId }) => {
			const project = await new ProjectsRepository(getDb()).create({
				id: crypto.randomUUID(),
				name: body.name,
				description: body.description,
				userId,
			});

			return project;
		},
		{
			body: t.Object({
				name: t.String(),
				description: t.String(),
			}),
		},
	)
	.patch(
		"/:id",
		async ({ params, body, userId, status }) => {
			const project = await new ProjectsRepository(getDb()).updateForUser(
				params.id,
				userId,
				body,
			);

			if (!project) {
				return status(404, "Project not found");
			}

			return project;
		},
		{
			params: t.Object({
				id: t.String(),
			}),
			body: t.Object({
				name: t.String(),
				description: t.String(),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, userId, status }) => {
			const deleted = await new ProjectsRepository(getDb()).deleteForUser(
				params.id,
				userId,
			);
			if (!deleted) {
				return status(404, "Project not found");
			}
			return deleted;
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	);
