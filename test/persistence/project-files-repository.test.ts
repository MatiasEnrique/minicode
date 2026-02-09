import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProjectFilesRepository } from "../../server/services/project-files-repository";
import { createPersistenceTestContext } from "./test-db";

const ctx = createPersistenceTestContext();

describe("ProjectFilesRepository", () => {
	beforeAll(async () => {
		await ctx.migrate();
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("upserts the same project path by updating existing row", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new ProjectFilesRepository(ctx.db);

		const first = await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: project.id,
			path: "src/main.ts",
			content: "console.log('v1');",
			userId: owner.id,
		});

		const second = await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: project.id,
			path: "src/main.ts",
			content: "console.log('v2');",
			userId: owner.id,
		});
		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		if (!first || !second) {
			throw new Error("Expected owner upsertFile to return a row");
		}

		const files = await repository.listByProjectForUser(project.id, owner.id);
		expect(files).toHaveLength(1);
		expect(files[0].id).toBe(first.id);
		expect(files[0].content).toBe("console.log('v2');");
		expect(second.id).toBe(first.id);
	});

	it("supports bulk upsert semantics", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new ProjectFilesRepository(ctx.db);

		const changedRows = await repository.upsertMany([
			{
				id: `file_${crypto.randomUUID()}`,
				projectId: project.id,
				path: "src/a.ts",
				content: "a1",
				userId: owner.id,
			},
			{
				id: `file_${crypto.randomUUID()}`,
				projectId: project.id,
				path: "src/b.ts",
				content: "b1",
				userId: owner.id,
			},
			{
				id: `file_${crypto.randomUUID()}`,
				projectId: project.id,
				path: "src/a.ts",
				content: "a2",
				userId: owner.id,
			},
		]);

		expect(changedRows).toBe(3);

		const files = await repository.listByProjectForUser(project.id, owner.id);
		expect(files).toHaveLength(2);
		expect(files.find((file) => file.path === "src/a.ts")?.content).toBe("a2");
		expect(files.find((file) => file.path === "src/b.ts")?.content).toBe("b1");
	});

	it("prevents non-owner read/write/delete access", async () => {
		const owner = await ctx.insertUser("owner");
		const nonOwner = await ctx.insertUser("non_owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new ProjectFilesRepository(ctx.db);

		await repository.upsertFile({
			id: `file_${crypto.randomUUID()}`,
			projectId: project.id,
			path: "src/owner.ts",
			content: "owner",
			userId: owner.id,
		});

		expect(
			await repository.listByProjectForUser(project.id, nonOwner.id),
		).toEqual([]);
		expect(
			await repository.upsertFile({
				id: `file_${crypto.randomUUID()}`,
				projectId: project.id,
				path: "src/hacked.ts",
				content: "hack",
				userId: nonOwner.id,
			}),
		).toBeNull();

		expect(
			await repository.upsertMany([
				{
					id: `file_${crypto.randomUUID()}`,
					projectId: project.id,
					path: "src/hacked-many.ts",
					content: "hack-many",
					userId: nonOwner.id,
				},
			]),
		).toBe(0);

		expect(
			await repository.deleteByPath({
				projectId: project.id,
				path: "src/owner.ts",
				userId: nonOwner.id,
			}),
		).toBe(false);

		const ownerFiles = await repository.listByProjectForUser(
			project.id,
			owner.id,
		);
		expect(ownerFiles).toHaveLength(1);
		expect(ownerFiles[0].path).toBe("src/owner.ts");
	});
});
