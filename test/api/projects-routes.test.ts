import { Elysia } from "elysia";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Projects API routes", () => {
	let app: any;

	beforeAll(async () => {
		await ctx.migrate();

		const { projectsRoute } = await import("../../server/routes/projects");
		app = new Elysia()
			.onError(({ error, set }) => {
				if (error instanceof Error && error.name === "UnauthorizedError") {
					set.status = 401;
					return "Unauthorized";
				}
			})
			.use(projectsRoute);
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("returns 401 when request is unauthenticated", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/projects", {
				method: "GET",
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe("Unauthorized");
	});

	it("lists only projects owned by authenticated user", async () => {
		const owner = await ctx.insertUser("owner");
		const otherUser = await ctx.insertUser("other");
		const ownerProject = await ctx.insertProject({ userId: owner.id, name: "Owner" });
		await ctx.insertProject({ userId: otherUser.id, name: "Other" });

		const response = await app.handle(
			new Request("http://localhost/api/projects", {
				method: "GET",
				headers: {
					"x-user-id": owner.id,
				},
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ id: string }>;
		expect(body).toHaveLength(1);
		expect(body[0].id).toBe(ownerProject.id);
	});

	it("returns 404 when non-owner requests project by id", async () => {
		const owner = await ctx.insertUser("owner");
		const otherUser = await ctx.insertUser("other");
		const ownerProject = await ctx.insertProject({ userId: owner.id, name: "Owner" });

		const response = await app.handle(
			new Request(`http://localhost/api/projects/${ownerProject.id}`, {
				method: "GET",
				headers: {
					"x-user-id": otherUser.id,
				},
			}),
		);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Project not found");
	});

	it("supports owner create, update and delete flow", async () => {
		const owner = await ctx.insertUser("owner");

		const createResponse = await app.handle(
			new Request("http://localhost/api/projects/", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-user-id": owner.id,
				},
				body: JSON.stringify({
					name: "Created Project",
					description: "created description",
				}),
			}),
		);

		expect(createResponse.status).toBe(200);
		const created = (await createResponse.json()) as {
			id: string;
			userId: string;
			name: string;
			description: string | null;
		};
		expect(created.userId).toBe(owner.id);
		expect(created.name).toBe("Created Project");
		expect(created.description).toBe("created description");

		const updateResponse = await app.handle(
			new Request(`http://localhost/api/projects/${created.id}`, {
				method: "PATCH",
				headers: {
					"content-type": "application/json",
					"x-user-id": owner.id,
				},
				body: JSON.stringify({
					name: "Updated Project",
					description: "updated description",
				}),
			}),
		);

		expect(updateResponse.status).toBe(200);
		const updated = (await updateResponse.json()) as { name: string };
		expect(updated.name).toBe("Updated Project");

		const deleteResponse = await app.handle(
			new Request(`http://localhost/api/projects/${created.id}`, {
				method: "DELETE",
				headers: {
					"x-user-id": owner.id,
				},
			}),
		);

		expect(deleteResponse.status).toBe(200);
		expect(await deleteResponse.json()).toBe(true);
	});

	it("returns 422 when payload validation fails", async () => {
		const owner = await ctx.insertUser("owner");

		const response = await app.handle(
			new Request("http://localhost/api/projects/", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-user-id": owner.id,
				},
				body: JSON.stringify({
					name: "Missing description",
				}),
			}),
		);

		expect(response.status).toBe(422);
	});
});
