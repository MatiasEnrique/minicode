import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProjectsRepository } from "../../server/services/projects-repository";
import { createPersistenceTestContext } from "./test-db";

const ctx = createPersistenceTestContext();

describe("ProjectsRepository", () => {
	beforeAll(async () => {
		await ctx.migrate();
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("supports owner create/list/update/delete", async () => {
		const owner = await ctx.insertUser("owner");
		const repository = new ProjectsRepository(ctx.db);

		const created = await repository.create({
			id: `project_${crypto.randomUUID()}`,
			userId: owner.id,
			name: "Initial Name",
			description: "Initial description",
		});

		expect(created.userId).toBe(owner.id);
		expect(created.status).toBe("idle");

		const listed = await repository.listByUserId(owner.id);
		expect(listed).toHaveLength(1);
		expect(listed[0].id).toBe(created.id);

		const updated = await repository.updateForUser(created.id, owner.id, {
			name: "Updated Name",
			description: "Updated description",
			status: "running",
			previewUrl: "http://localhost:4173",
			sandboxId: "sandbox_1",
		});

		expect(updated).not.toBeNull();
		expect(updated?.name).toBe("Updated Name");
		expect(updated?.status).toBe("running");
		expect(updated?.previewUrl).toBe("http://localhost:4173");
		expect(updated?.sandboxId).toBe("sandbox_1");

		const deleted = await repository.deleteForUser(created.id, owner.id);
		expect(deleted).toBe(true);
		expect(await repository.getByIdForUser(created.id, owner.id)).toBeNull();
	});

	it("prevents non-owner read/update/delete", async () => {
		const owner = await ctx.insertUser("owner");
		const nonOwner = await ctx.insertUser("non_owner");
		const repository = new ProjectsRepository(ctx.db);

		const created = await repository.create({
			id: `project_${crypto.randomUUID()}`,
			userId: owner.id,
			name: "Owner Project",
			description: null,
		});

		expect(await repository.getByIdForUser(created.id, nonOwner.id)).toBeNull();
		expect(
			await repository.updateForUser(created.id, nonOwner.id, {
				name: "Hacked",
			}),
		).toBeNull();
		expect(await repository.deleteForUser(created.id, nonOwner.id)).toBe(false);

		const ownerView = await repository.getByIdForUser(created.id, owner.id);
		expect(ownerView).not.toBeNull();
		expect(ownerView?.name).toBe("Owner Project");
	});
});
