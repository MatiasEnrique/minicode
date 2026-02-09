import { agent_states, projects } from "@shared/db/schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentStatesRepository } from "../../server/services/agent-states-repository";
import { createPersistenceTestContext } from "../persistence/test-db";

const ctx = createPersistenceTestContext();

vi.mock("server/middleware/auth", async () => {
	const { Elysia } = await import("elysia");
	return {
		requireAuth: new Elysia({ name: "requireAuth" }),
	};
});

vi.mock("@shared/db", async () => {
	const actual = await vi.importActual<typeof import("@shared/db")>("@shared/db");
	return {
		...actual,
		getDb: () => ctx.db,
	};
});

type ProjectWebSocketServerMessage = import("../../server/websocket/types").ProjectWebSocketServerMessage;

interface MockProjectWebSocket {
	id: string;
	data: {
		params: {
			projectId: string;
		};
		userId: string;
	};
	sentMessages: ProjectWebSocketServerMessage[];
	closedWith: {
		code?: number;
		reason?: string;
	} | null;
	send: ReturnType<typeof vi.fn<(message: unknown) => void>>;
	close: ReturnType<typeof vi.fn<(code?: number, reason?: string) => void>>;
}

interface WebSocketRouteHooks {
	open: (ws: MockProjectWebSocket) => Promise<void>;
	message: (ws: MockProjectWebSocket, message: unknown) => Promise<void>;
	close: (ws: MockProjectWebSocket) => void;
}

function createMockSocket(input: {
	projectId: string;
	userId: string;
}): MockProjectWebSocket {
	const ws: MockProjectWebSocket = {
		id: `ws_${crypto.randomUUID()}`,
		data: {
			params: {
				projectId: input.projectId,
			},
			userId: input.userId,
		},
		sentMessages: [],
		closedWith: null,
		send: vi.fn(),
		close: vi.fn(),
	};

	ws.send.mockImplementation((message: unknown) => {
		ws.sentMessages.push(message as ProjectWebSocketServerMessage);
	});
	ws.close.mockImplementation((code?: number, reason?: string) => {
		ws.closedWith = { code, reason };
	});

	return ws;
}

describe("WebSocket contract", () => {
	let wsHooks: WebSocketRouteHooks;

	beforeAll(async () => {
		await ctx.migrate();

		const websocketModule = await import("../../server/websocket/handler");
		wsHooks = websocketModule.websocketLifecycle as WebSocketRouteHooks;
	});

	beforeEach(async () => {
		await ctx.reset();
	});

	afterAll(async () => {
		await ctx.close();
	});

	it("returns agent_connected on authorized open", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.open(ws);

		expect(ws.close).not.toHaveBeenCalled();
		expect(ws.sentMessages).toEqual([
			{
				type: "agent_connected",
				data: {
					projectId: project.id,
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("rejects access for non-owner with project_access_denied and closes socket", async () => {
		const owner = await ctx.insertUser("owner");
		const nonOwner = await ctx.insertUser("non_owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const ws = createMockSocket({
			projectId: project.id,
			userId: nonOwner.id,
		});

		await wsHooks.open(ws);

		expect(ws.sentMessages).toEqual([
			{
				type: "error",
				data: {
					code: "project_access_denied",
					message: "Project not found or not accessible for this user",
				},
			},
		]);
		expect(ws.closedWith).toEqual({
			code: 4003,
			reason: "Forbidden",
		});
	});

	it("rejects unknown client message types", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "totally_unknown",
				data: {},
			}),
		);

		expect(ws.sentMessages).toEqual([
			{
				type: "error",
				data: {
					code: "unknown_message_type",
					message: 'Unknown message type "totally_unknown"',
				},
			},
		]);
		expect(ws.close).not.toHaveBeenCalled();

		wsHooks.close(ws);
	});

	it("rejects malformed websocket payloads with invalid_message", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(ws, "{ not-json");

		expect(ws.sentMessages).toEqual([
			{
				type: "error",
				data: {
					code: "invalid_message",
					message:
						"WebSocket message must be valid JSON and follow the { type, data } shape",
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("rejects invalid user_message payloads with invalid_message_data", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "user_message",
				data: {
					content: "   ",
				},
			}),
		);

		expect(ws.sentMessages).toEqual([
			{
				type: "error",
				data: {
					code: "invalid_message_data",
					message: '"user_message" requires data.content as a non-empty string',
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("returns state_update for get_state", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		await ctx.db
			.update(projects)
			.set({
				status: "running",
				previewUrl: "http://localhost:4173",
			})
			.where(eq(projects.id, project.id));

		await ctx.db.insert(agent_states).values({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			currentState: "generating",
			currentPhase: 2,
			phases: [
				{
					name: "phase-1",
					description: "design",
					files: [{ path: "src/main.ts", purpose: "bootstrap" }],
					isLastPhase: false,
				},
				{
					name: "phase-2",
					description: "implement",
					files: [{ path: "src/app.tsx", purpose: "ui" }],
					isLastPhase: true,
				},
			],
			generatedFiles: ["src/main.ts", "src/app.tsx"],
			conversationHistory: [],
			sandboxId: null,
			previewUrl: "http://localhost:5174",
		});

		const [beforeStop] = await ctx.db
			.select()
			.from(agent_states)
			.where(eq(agent_states.projectId, project.id));
		expect(beforeStop.generatedFiles).toEqual(["src/main.ts", "src/app.tsx"]);
		const fromRepository = await new AgentStatesRepository(ctx.db).getByProjectForUser(
			project.id,
			owner.id,
		);
		expect(fromRepository?.generatedFiles).toEqual([
			"src/main.ts",
			"src/app.tsx",
		]);

		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "get_state",
				data: {},
			}),
		);

		expect(ws.sentMessages).toEqual([
			{
				type: "state_update",
				data: {
					currentState: "generating",
					currentPhase: 2,
					totalPhases: 2,
					generatedFiles: ["src/main.ts", "src/app.tsx"],
					previewUrl: "http://localhost:5174",
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("returns preview_url for get_preview_url", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		await ctx.db
			.update(projects)
			.set({
				previewUrl: "http://localhost:4174",
			})
			.where(eq(projects.id, project.id));

		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "get_preview_url",
				data: {},
			}),
		);

		expect(ws.sentMessages).toEqual([
			{
				type: "preview_url",
				data: {
					previewUrl: "http://localhost:4174",
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("starts generation and returns state_update", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });

		await ctx.db.insert(agent_states).values({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			currentState: "idle",
			currentPhase: null,
			phases: [],
			generatedFiles: ["src/existing.ts"],
			conversationHistory: [],
			sandboxId: "sandbox_1",
			previewUrl: "http://localhost:4174",
		});

		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "start_generation",
				data: {},
			}),
		);

		expect(ws.sentMessages).toEqual([
			{
				type: "state_update",
				data: {
					currentState: "generating",
					currentPhase: 0,
					totalPhases: 0,
					generatedFiles: [],
					previewUrl: "http://localhost:4174",
				},
			},
		]);

		const [persisted] = await ctx.db
			.select()
			.from(agent_states)
			.where(eq(agent_states.projectId, project.id));
		expect(persisted.currentState).toBe("generating");
		expect(persisted.currentPhase).toBe(0);
		expect(persisted.phases).toEqual([]);
		expect(persisted.generatedFiles).toEqual([]);
		expect(persisted.previewUrl).toBe("http://localhost:4174");

		wsHooks.close(ws);
	});

	it("stops generation and preserves generated files, preview url and conversation history", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const conversationHistory = [
			{
				role: "user" as const,
				content: "continue building",
				timestamp: new Date().toISOString(),
			},
		];

		await ctx.db.insert(agent_states).values({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			currentState: "generating",
			currentPhase: 3,
			phases: [
				{
					name: "phase-1",
					description: "base",
					files: [{ path: "src/main.ts", purpose: "bootstrap" }],
					isLastPhase: false,
				},
			],
			generatedFiles: ["src/main.ts", "src/app.tsx"],
			conversationHistory,
			sandboxId: "sandbox_2",
			previewUrl: "http://localhost:5174",
		});

		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "stop_generation",
				data: {},
			}),
		);

		const [persisted] = await ctx.db
			.select()
			.from(agent_states)
			.where(eq(agent_states.projectId, project.id));
		expect(persisted.currentState).toBe("idle");
		expect(persisted.currentPhase).toBeNull();
		expect(persisted.phases).toEqual([]);
		expect(persisted.generatedFiles).toEqual(["src/main.ts", "src/app.tsx"]);
		expect(persisted.previewUrl).toBe("http://localhost:5174");
		expect(persisted.sandboxId).toBe("sandbox_2");
		expect(persisted.conversationHistory).toEqual(conversationHistory);

		expect(ws.sentMessages).toEqual([
			{
				type: "state_update",
				data: {
					currentState: "idle",
					currentPhase: null,
					totalPhases: 0,
					generatedFiles: ["src/main.ts", "src/app.tsx"],
					previewUrl: "http://localhost:5174",
				},
			},
		]);

		wsHooks.close(ws);
	});

	it("appends user_message to conversation history without resetting run context", async () => {
		const owner = await ctx.insertUser("owner");
		const project = await ctx.insertProject({ userId: owner.id });
		const initialConversationHistory = [
			{
				role: "assistant" as const,
				content: "How should I continue?",
				timestamp: new Date().toISOString(),
			},
		];

		await ctx.db.insert(agent_states).values({
			id: `state_${crypto.randomUUID()}`,
			projectId: project.id,
			currentState: "idle",
			currentPhase: null,
			phases: [],
			generatedFiles: ["src/main.ts"],
			conversationHistory: initialConversationHistory,
			sandboxId: "sandbox_3",
			previewUrl: "http://localhost:5174",
		});

		const ws = createMockSocket({
			projectId: project.id,
			userId: owner.id,
		});

		await wsHooks.message(
			ws,
			JSON.stringify({
				type: "user_message",
				data: {
					content: "Add a settings page",
				},
			}),
		);

		const [persisted] = await ctx.db
			.select()
			.from(agent_states)
			.where(eq(agent_states.projectId, project.id));
		const conversationHistory = persisted.conversationHistory ?? [];

		expect(conversationHistory).toHaveLength(2);
		expect(conversationHistory[0]).toEqual(initialConversationHistory[0]);
		expect(conversationHistory[1]).toMatchObject({
			role: "user",
			content: "Add a settings page",
		});
		expect(persisted.generatedFiles).toEqual(["src/main.ts"]);
		expect(persisted.previewUrl).toBe("http://localhost:5174");

		expect(ws.sentMessages).toHaveLength(1);
		expect(ws.sentMessages[0]).toMatchObject({
			type: "state_update",
			data: {
				currentState: "idle",
				currentPhase: null,
				totalPhases: 0,
				generatedFiles: ["src/main.ts"],
				previewUrl: "http://localhost:5174",
			},
		});

		wsHooks.close(ws);
	});
});
