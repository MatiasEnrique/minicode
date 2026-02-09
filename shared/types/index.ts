export interface Message {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: string;
}

export interface Phase {
	name: string;
	description: string;
	files: Array<{
		path: string;
		purpose: string;
	}>;
	isLastPhase: boolean;
}

export interface ClientMessage {
	type:
		| "start_generation"
		| "stop_generation"
		| "user_message"
		| "get_state"
		| "get_preview_url";
	data?: unknown;
}

export interface UserMessageData {
	content: string;
}

export interface ServerMessage {
	type:
		| "agent_connected"
		| "state_update"
		| "file_start"
		| "file_chunk"
		| "file_end"
		| "phase_start"
		| "phase_end"
		| "generation_complete"
		| "generation_error"
		| "preview_url"
		| "sandbox_log"
		| "error";
	data: unknown;
}

export interface FileStartData {
	path: string;
}

export interface FileChunkData {
	path: string;
	chunk: string;
}

export interface FileEndData {
	path: string;
	content: string;
}

export interface StateUpdateData {
	currentState: string;
	currentPhase: number | null;
	totalPhases: number;
	generatedFiles: string[];
	previewUrl: string | null;
}

export interface SandboxLogData {
	type: "stdout" | "stderr";
	content: string;
}
