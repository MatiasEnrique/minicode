import { getDb } from "@shared/db";
import Elysia, { t } from "elysia";
import { requireAuth } from "server/middleware/auth";
import { AgentStatesRepository } from "server/services/agent-states-repository";
import { ProjectsRepository } from "server/services/projects-repository";
import type {
	ProjectWebSocketConnection,
	ProjectWebSocketServerMessage,
	WebSocketErrorCode,
} from "./types";
import { validateClientMessage } from "./validators";

type ProjectWebSocket = {
	id: string;
	data: {
		params: {
			projectId: string;
		};
		userId: string;
	};
	send(message: unknown): unknown;
	close(code?: number, reason?: string): unknown;
};

const wsConnections = new Map<string, ProjectWebSocketConnection>();

function sendServerMessage(
	ws: ProjectWebSocket,
	message: ProjectWebSocketServerMessage,
): void {
	ws.send(message);
}

function sendErrorMessage(
	ws: ProjectWebSocket,
	code: WebSocketErrorCode,
	message: string,
): void {
	sendServerMessage(ws, {
		type: "error",
		data: {
			code,
			message,
		},
	});
}

async function ensureAuthorizedConnection(
	ws: ProjectWebSocket,
): Promise<ProjectWebSocketConnection | null> {
	const existingConnection = wsConnections.get(ws.id);
	if (existingConnection) {
		return existingConnection;
	}

	const connection: ProjectWebSocketConnection = {
		connectionId: ws.id,
		projectId: ws.data.params.projectId,
		userId: ws.data.userId,
	};

	const project = await new ProjectsRepository(getDb()).getByIdForUser(
		connection.projectId,
		connection.userId,
	);

	if (!project) {
		sendErrorMessage(
			ws,
			"project_access_denied",
			"Project not found or not accessible for this user",
		);
		ws.close(4003, "Forbidden");
		return null;
	}

	wsConnections.set(connection.connectionId, connection);
	return connection;
}

async function sendStateUpdate(
	ws: ProjectWebSocket,
	connection: ProjectWebSocketConnection,
): Promise<void> {
	const projectsRepository = new ProjectsRepository(getDb());
	const project = await projectsRepository.getByIdForUser(
		connection.projectId,
		connection.userId,
	);

	if (!project) {
		sendErrorMessage(
			ws,
			"project_access_denied",
			"Project not found or not accessible for this user",
		);
		ws.close(4003, "Forbidden");
		return;
	}

	const agentState = await new AgentStatesRepository(
		getDb(),
	).getByProjectForUser(connection.projectId, connection.userId);

	sendServerMessage(ws, {
		type: "state_update",
		data: {
			currentState: agentState?.currentState ?? project.status,
			currentPhase: agentState?.currentPhase ?? null,
			totalPhases: agentState?.phases?.length ?? 0,
			generatedFiles: agentState?.generatedFiles ?? [],
			previewUrl: agentState?.previewUrl ?? project.previewUrl ?? null,
		},
	});
}

async function sendPreviewUrl(
	ws: ProjectWebSocket,
	connection: ProjectWebSocketConnection,
): Promise<void> {
	const project = await new ProjectsRepository(getDb()).getByIdForUser(
		connection.projectId,
		connection.userId,
	);

	if (!project) {
		sendErrorMessage(
			ws,
			"project_access_denied",
			"Project not found or not accessible for this user",
		);
		ws.close(4003, "Forbidden");
		return;
	}

	sendServerMessage(ws, {
		type: "preview_url",
		data: {
			previewUrl: project.previewUrl ?? null,
		},
	});
}

async function handleStartGeneration(
	ws: ProjectWebSocket,
	connection: ProjectWebSocketConnection,
) {
	const projectsRepository = new ProjectsRepository(getDb());
	const project = await projectsRepository.getByIdForUser(
		connection.projectId,
		connection.userId,
	);

	if (!project) {
		sendErrorMessage(
			ws,
			"project_access_denied",
			"Project not found or not accessible for this user",
		);
		ws.close(4003, "Forbidden");
		return;
	}

	const agentState = await new AgentStatesRepository(
		getDb(),
	).getByProjectForUser(connection.projectId, connection.userId);
	if (!agentState) {
		sendErrorMessage(ws, "internal_error", "Agent state not found");
		ws.close(4004, "Not Found");
		return;
	}

	if (agentState.currentState === "generating") {
		sendErrorMessage(
			ws,
			"generation_in_progress",
			"Generation already in progress",
		);

		ws.close(4000, "Conflict");
		return;
	}

	agentState.currentState = "generating";
	await new AgentStatesRepository(getDb()).upsertForProject({
		id: agentState.id,
		projectId: connection.projectId,
		userId: connection.userId,
		currentState: "generating",
		currentPhase: 0,
		phases: [],
		generatedFiles: [],
		conversationHistory: [],
	});

	sendServerMessage(ws, {
		type: "state_update",
		data: {
			currentState: "generating",
			currentPhase: 0,
			totalPhases: 0,
			generatedFiles: [],
			previewUrl: agentState.previewUrl ?? null,
		},
	});
}

async function handleStopGeneration(
	ws: ProjectWebSocket,
	connection: ProjectWebSocketConnection,
) {
	const agentState = await new AgentStatesRepository(
		getDb(),
	).getByProjectForUser(connection.projectId, connection.userId);

	const repo = new AgentStatesRepository(getDb());

	if (!agentState) {
		sendErrorMessage(ws, "internal_error", "Agent state not found");
		ws.close(4004, "Not Found");
		return;
	}

	if (agentState.currentState !== "generating") {
		sendErrorMessage(
			ws,
			"generation_not_in_progress",
			"Generation not in progress",
		);
		ws.close(4000, "Conflict");
		return;
	}

	agentState.currentState = "idle";
	agentState.generatedFiles = [];
	agentState.currentPhase = null;

	const stopped = await repo.upsertForProject({
		id: agentState.id,
		projectId: connection.projectId,
		userId: connection.userId,
		currentState: "idle",
		currentPhase: null,
		phases: [], // totalPhases -> 0
	});

	sendServerMessage(ws, {
		type: "state_update",
		data: {
			currentState: "idle",
			currentPhase: null,
			totalPhases: 0,
			generatedFiles:
				stopped?.generatedFiles ?? agentState.generatedFiles ?? [],
			previewUrl: stopped?.previewUrl ?? agentState.previewUrl ?? null,
		},
	});
}

async function handleUserMessage(
	ws: ProjectWebSocket,
	connection: ProjectWebSocketConnection,
	content: string,
): Promise<void> {
	const repo = new AgentStatesRepository(getDb());
	const agentState = await repo.getByProjectForUser(
		connection.projectId,
		connection.userId,
	);

	if (!agentState) {
		sendErrorMessage(ws, "internal_error", "Agent state not found");
		ws.close(4004, "Not Found");
		return;
	}

	const conversationHistory = [
		...(agentState.conversationHistory ?? []),
		{
			role: "user" as const,
			content,
			timestamp: new Date().toISOString(),
		},
	];

	const updatedState = await repo.upsertForProject({
		id: agentState.id,
		projectId: connection.projectId,
		userId: connection.userId,
		currentState: agentState.currentState,
		currentPhase: agentState.currentPhase,
		conversationHistory,
	});

	const nextPhases = updatedState?.phases ?? agentState.phases ?? [];
	const nextGeneratedFiles =
		updatedState?.generatedFiles ?? agentState.generatedFiles ?? [];
	const nextPreviewUrl =
		updatedState?.previewUrl ?? agentState.previewUrl ?? null;

	sendServerMessage(ws, {
		type: "state_update",
		data: {
			currentState: updatedState?.currentState ?? agentState.currentState,
			currentPhase: updatedState?.currentPhase ?? agentState.currentPhase,
			totalPhases: nextPhases.length,
			generatedFiles: nextGeneratedFiles,
			previewUrl: nextPreviewUrl,
		},
	});
}

export const websocketLifecycle = {
	async open(ws: ProjectWebSocket) {
		try {
			const connection = await ensureAuthorizedConnection(ws);
			if (!connection) {
				return;
			}

			sendServerMessage(ws, {
				type: "agent_connected",
				data: {
					projectId: connection.projectId,
				},
			});
		} catch {
			sendErrorMessage(
				ws,
				"internal_error",
				"Failed to initialize websocket connection",
			);
			ws.close(1011, "Internal server error");
		}
	},
	async message(ws: ProjectWebSocket, message: unknown) {
		try {
			const connection = await ensureAuthorizedConnection(ws);
			if (!connection) {
				return;
			}

			const validatedMessage = validateClientMessage(message);
			if (!validatedMessage.ok) {
				sendErrorMessage(
					ws,
					validatedMessage.error.code,
					validatedMessage.error.message,
				);
				return;
			}

			switch (validatedMessage.value.type) {
				case "get_state":
					await sendStateUpdate(ws, connection);
					return;
				case "get_preview_url":
					await sendPreviewUrl(ws, connection);
					return;
				case "start_generation":
					await handleStartGeneration(ws, connection);
					return;
				case "stop_generation":
					await handleStopGeneration(ws, connection);
					return;
				case "user_message":
					await handleUserMessage(ws, connection, validatedMessage.value.data.content);
					return;
			}
		} catch {
			sendErrorMessage(
				ws,
				"internal_error",
				"Failed to handle websocket message",
			);
		}
	},
	close(ws: ProjectWebSocket) {
		wsConnections.delete(ws.id);
	},
};

export const websocketHandler = new Elysia()
	.use(requireAuth)
	.ws("/ws/:projectId", {
		params: t.Object({
			projectId: t.String(),
		}),
		...websocketLifecycle,
	});
