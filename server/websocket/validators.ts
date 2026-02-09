import { z } from "zod";
import {
	CLIENT_MESSAGE_TYPES,
	type ValidatedClientMessage,
	type WebSocketErrorData,
} from "./types";

const decoder = new TextDecoder();
const userMessageDataSchema = z.object({
	content: z.string().trim().min(1),
});

export type ClientMessageValidationResult =
	| {
			ok: true;
			value: ValidatedClientMessage;
	  }
	| {
			ok: false;
			error: WebSocketErrorData;
	  };

const knownClientMessageTypes = new Set<string>(CLIENT_MESSAGE_TYPES);

function toError(
	code: WebSocketErrorData["code"],
	message: string,
): ClientMessageValidationResult {
	return {
		ok: false,
		error: {
			code,
			message,
		},
	};
}

function decodeIfBinary(rawMessage: unknown): unknown {
	if (rawMessage instanceof ArrayBuffer) {
		return decoder.decode(rawMessage);
	}

	if (ArrayBuffer.isView(rawMessage)) {
		return decoder.decode(rawMessage);
	}

	return rawMessage;
}

function toPlainObject(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, unknown>;
}

function parseMessagePayload(rawMessage: unknown): unknown {
	const decodedPayload = decodeIfBinary(rawMessage);
	if (typeof decodedPayload === "string") {
		return JSON.parse(decodedPayload);
	}
	return decodedPayload;
}

export function validateClientMessage(
	rawMessage: unknown,
): ClientMessageValidationResult {
	let messagePayload: unknown;
	try {
		messagePayload = parseMessagePayload(rawMessage);
	} catch {
		return toError(
			"invalid_message",
			"WebSocket message must be valid JSON and follow the { type, data } shape",
		);
	}

	const envelope = toPlainObject(messagePayload);
	if (!envelope) {
		return toError(
			"invalid_message",
			"WebSocket message must be an object with a string type field",
		);
	}

	const type = envelope.type;
	if (typeof type !== "string") {
		return toError(
			"invalid_message",
			'WebSocket message "type" must be a string',
		);
	}

	if (!knownClientMessageTypes.has(type)) {
		return toError("unknown_message_type", `Unknown message type "${type}"`);
	}

	const normalizedData = envelope.data ?? {};
	const data = toPlainObject(normalizedData);
	if (!data) {
		return toError(
			"invalid_message_data",
			'WebSocket message "data" must be an object',
		);
	}

	switch (type) {
		case "start_generation":
			return { ok: true, value: { type, data } };
		case "stop_generation":
			return { ok: true, value: { type, data } };
		case "get_state":
			return { ok: true, value: { type, data } };
		case "get_preview_url":
			return { ok: true, value: { type, data } };
		case "user_message": {
			const userMessageDataResult = userMessageDataSchema.safeParse(data);
			if (!userMessageDataResult.success) {
				return toError(
					"invalid_message_data",
					'"user_message" requires data.content as a non-empty string',
				);
			}
			return {
				ok: true,
				value: {
					type,
					data: userMessageDataResult.data,
				},
			};
		}
		default:
			return toError("unknown_message_type", `Unknown message type "${type}"`);
	}
}
