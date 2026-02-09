import { Elysia } from "elysia";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectFilesRepository } from "../../server/services/project-files-repository";
import { createPersistenceTestContext } from "../persistence/test-db";

const ctx = createPersistenceTestContext();

vi.mock("server/middleware/auth", async () => {
	const { Elysia } = await import("elysia");

	class UnauthorizedError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "UnauthorizedError";
		}
	}

	const requireAuth = new Elysia({ name: "requireAuth" }).derive(
		{ as: "global" },
		({ request }) => {
			const userId = request.headers.get("x-user-id");
			if (!userId) {
				throw new UnauthorizedError("Unauthorized");
			}

			return {
				userId,
				authSession: {
					user: {
						id: userId,
					},
				},
			};
		},
	);

	return {
		requireAuth,
	};
});

vi.mock("@shared/db", async () => {
	const actual = await vi.importActual<typeof import("@shared/db")>("@shared/db");
	return {
		...actual,
		getDb: () => ctx.db,
	};
});

describe("Project files API routes", () => {
	let app: any;

	beforeAll(async () => {
		await ctx.migrate();

		const { projectFilesRoute } = await import("../../server/routes/project-files");
		app = new Elysia()
			.onError(({ error, set }) => {
				if (error instanceof Error && error.name === "UnauthorizedError") {
					set.status = 401;
					return "Unauthorized";
				}
			})
			.use(projectFilesRoute);
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("returns 401 when request is unauthenticated", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });

		const response = await app.handle(
			new Request(`http://localhost/api/project-files/${project.id}`, {
				method: "GET",
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe("Unauthorized");
	});

	it("lists files owned by authenticated user only", async () => {
		const owner = await ctx.insertUser("owner");
		const otherUser = await ctx.insertUser("other");
		const ownerProject = await ctx.insertProject({ userId: owner.id });
		const otherProject = await ctx.insertProject({ userId: otherUser.id });
		const repository = new ProjectFilesRepository(ctx.db);

		await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: ownerProject.id,
			path: "src/owner.ts",
			content: "owner-content",
			userId: owner.id,
		});
		await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: otherProject.id,
			path: "src/other.ts",
			content: "other-content",
			userId: otherUser.id,
		});

		const response = await app.handle(
			new Request(`http://localhost/api/project-files/${ownerProject.id}`, {
				method: "GET",
				headers: {
					"x-user-id": owner.id,
				},
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ path: string }>;
		expect(body).toHaveLength(1);
		expect(body[0].path).toBe("src/owner.ts");
	});

	it("returns 404 for non-owner file lookup", async () => {
		const owner = await ctx.insertUser("owner");
		const otherUser = await ctx.insertUser("other");
		const ownerProject = await ctx.insertProject({ userId: owner.id });
		const repository = new ProjectFilesRepository(ctx.db);

		const ownerFile = await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: ownerProject.id,
			path: "src/owner.ts",
			content: "owner-content",
			userId: owner.id,
		});
		if (!ownerFile) {
			throw new Error("Expected owner file to be created");
		}

		const response = await app.handle(
			new Request(
				`http://localhost/api/project-files/${ownerProject.id}/${ownerFile.id}`,
				{
					method: "GET",
					headers: {
						"x-user-id": otherUser.id,
					},
				},
			),
		);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Project file not found");
	});

	it("supports owner upsert via PUT and returns persisted file", async () => {
		const owner = await ctx.insertUser("owner");
		const ownerProject = await ctx.insertProject({ userId: owner.id });

		const response = await app.handle(
			new Request(`http://localhost/api/project-files/${ownerProject.id}`, {
				method: "PUT",
				headers: {
					"content-type": "application/json",
					"x-user-id": owner.id,
				},
				body: JSON.stringify({
					path: "src/new-file.ts",
					content: "export const value = 1;",
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { path: string; content: string };
		expect(body.path).toBe("src/new-file.ts");
		expect(body.content).toBe("export const value = 1;");
	});

	it("returns 404 for non-owner upsert attempt", async () => {
		const owner = await ctx.insertUser("owner");
		const otherUser = await ctx.insertUser("other");
		const ownerProject = await ctx.insertProject({ userId: owner.id });

		const response = await app.handle(
			new Request(`http://localhost/api/project-files/${ownerProject.id}`, {
				method: "PUT",
				headers: {
					"content-type": "application/json",
					"x-user-id": otherUser.id,
				},
				body: JSON.stringify({
					path: "src/hacked.ts",
					content: "hack",
				}),
			}),
		);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Project file not found");
	});

	it("returns 422 when payload validation fails", async () => {
		const owner = await ctx.insertUser("owner");
		const ownerProject = await ctx.insertProject({ userId: owner.id });

		const response = await app.handle(
			new Request(`http://localhost/api/project-files/${ownerProject.id}`, {
				method: "PUT",
				headers: {
					"content-type": "application/json",
					"x-user-id": owner.id,
				},
				body: JSON.stringify({
					path: "src/invalid.ts",
				}),
			}),
		);

		expect(response.status).toBe(422);
	});
});
