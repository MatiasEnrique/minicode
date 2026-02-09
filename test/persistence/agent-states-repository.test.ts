import { agent_states } from "@shared/db/schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AgentStatesRepository } from "../../server/services/agent-states-repository";
import { createPersistenceTestContext } from "./test-db";

const ctx = createPersistenceTestContext();

describe("AgentStatesRepository", () => {
	beforeAll(async () => {
		await ctx.migrate();
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("creates then updates the same project state via upsert", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new AgentStatesRepository(ctx.db);

		const first = await repository.upsertForProject({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			userId: owner.id,
			currentState: "generating",
			currentPhase: 0,
			phases: [
				{
					name: "phase-1",
					description: "initial",
					files: [{ path: "src/main.ts", purpose: "bootstrap" }],
					isLastPhase: false,
				},
			],
			generatedFiles: ["src/main.ts"],
			conversationHistory: [
				{
					role: "user",
					content: "Build an app",
					timestamp: new Date().toISOString(),
				},
			],
		});

		const second = await repository.upsertForProject({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			userId: owner.id,
			currentState: "completed",
			currentPhase: 1,
			phases: [
				{
					name: "phase-1",
					description: "initial",
					files: [{ path: "src/main.ts", purpose: "bootstrap" }],
					isLastPhase: true,
				},
			],
			generatedFiles: ["src/main.ts", "src/app.ts"],
			conversationHistory: [
				{
					role: "assistant",
					content: "Done",
					timestamp: new Date().toISOString(),
				},
			],
		});
		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		if (!first || !second) {
			throw new Error("Expected owner upsertForProject to return a row");
		}

		expect(second.id).toBe(first.id);
		expect(second.currentState).toBe("completed");
		expect(second.currentPhase).toBe(1);
		expect(second.generatedFiles).toEqual(["src/main.ts", "src/app.ts"]);

		const persisted = await repository.getByProjectForUser(
			project.id,
			owner.id,
		);
		expect(persisted).not.toBeNull();
		expect(persisted?.currentState).toBe("completed");

		const rows = await ctx.db
			.select()
			.from(agent_states)
			.where(eq(agent_states.projectId, project.id));
		expect(rows).toHaveLength(1);
	});

	it("prevents non-owner read/write/reset access", async () => {
		const owner = await ctx.insertUser("owner");
		const nonOwner = await ctx.insertUser("non_owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new AgentStatesRepository(ctx.db);

		await repository.upsertForProject({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			userId: owner.id,
			currentState: "idle",
			currentPhase: null,
			phases: [],
			generatedFiles: [],
			conversationHistory: [],
		});

		expect(
			await repository.getByProjectForUser(project.id, nonOwner.id),
		).toBeNull();

		expect(
			await repository.upsertForProject({
				id: `state_${crypto.randomUUID()}`,
				projectId: project.id,
				userId: nonOwner.id,
				currentState: "hijacked",
				currentPhase: 99,
				phases: [],
				generatedFiles: [],
				conversationHistory: [],
			}),
		).toBeNull();

		expect(
			await repository.resetForProject({
				projectId: project.id,
				userId: nonOwner.id,
			}),
		).toBe(false);

		expect(
			await repository.getByProjectForUser(project.id, owner.id),
		).not.toBeNull();
	});

	it("allows owner reset semantics", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const repository = new AgentStatesRepository(ctx.db);

		await repository.upsertForProject({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			userId: owner.id,
			currentState: "idle",
			currentPhase: null,
			phases: [],
			generatedFiles: [],
			conversationHistory: [],
		});

		expect(
			await repository.resetForProject({
				projectId: project.id,
				userId: owner.id,
			}),
		).toBe(true);
		expect(
			await repository.getByProjectForUser(project.id, owner.id),
		).toBeNull();
	});
});
