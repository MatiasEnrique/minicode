import type {
	ClientMessage,
	StateUpdateData,
	UserMessageData,
} from "@shared/types";

export const CLIENT_MESSAGE_TYPES = [
	"start_generation",
	"stop_generation",
	"user_message",
	"get_state",
	"get_preview_url",
] as const satisfies readonly ClientMessage["type"][];

export type ClientMessageType = ClientMessage["type"];

type ControlMessageType = Exclude<ClientMessageType, "user_message">;

export type ValidatedClientMessage =
	| {
			type: ControlMessageType;
			data: Record<string, unknown>;
	  }
	| {
			type: "user_message";
			data: UserMessageData;
	  };

export type WebSocketErrorCode =
	| "invalid_message"
	| "invalid_message_data"
	| "unknown_message_type"
	| "project_access_denied"
	| "not_implemented"
	| "internal_error"
	| "generation_in_progress"
	| "generation_not_in_progress";

export interface WebSocketErrorData {
	code: WebSocketErrorCode;
	message: string;
}

export type ProjectWebSocketServerMessage =
	| {
			type: "agent_connected";
			data: {
				projectId: string;
			};
	  }
	| {
			type: "state_update";
			data: StateUpdateData;
	  }
	| {
			type: "preview_url";
			data: {
				previewUrl: string | null;
			};
	  }
	| {
			type: "generation_error";
			data: {
				message: string;
			};
	  }
	| {
			type: "error";
			data: WebSocketErrorData;
	  };

export interface ProjectWebSocketConnection {
	connectionId: string;
	projectId: string;
	userId: string;
}
