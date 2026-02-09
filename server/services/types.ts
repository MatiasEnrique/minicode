import type { agent_states, projectFiles, projects } from "@shared/db";
import type { Message, Phase } from "@shared/types";

export type Project = typeof projects.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type AgentState = typeof agent_states.$inferSelect;

export type ProjectUpdatePatch = Partial<
	Pick<Project, "name" | "description" | "status" | "previewUrl" | "sandboxId">
>;

export interface CreateProjectInput {
	id: string;
	userId: string;
	name: string;
	description?: string | null;
}

export interface UpsertProjectFileInput {
	id: string;
	projectId: string;
	path: string;
	content: string;
	userId: string;
}

export interface DeleteProjectFileByPathInput {
	projectId: string;
	path: string;
	userId: string;
}

export interface UpsertAgentStateInput {
	id: string;
	projectId: string;
	userId: string;
	currentState: string;
	sandboxId?: string | null;
	previewUrl?: string | null;
	currentPhase: number | null;
	phases?: Phase[];
	generatedFiles?: string[];
	conversationHistory?: Message[];
}

export interface ResetAgentStateInput {
	projectId: string;
	userId: string;
}

export interface IProjectRepository {
	listByUserId(userId: string): Promise<Project[]>;
	getByIdForUser(projectId: string, userId: string): Promise<Project | null>;
	create(input: CreateProjectInput): Promise<Project>;
	updateForUser(
		projectId: string,
		userId: string,
		patch: ProjectUpdatePatch,
	): Promise<Project | null>;
	deleteForUser(projectId: string, userId: string): Promise<boolean>;
}

export interface IProjectFilesRepository {
	listByProjectForUser(
		projectId: string,
		userId: string,
	): Promise<ProjectFile[]>;
	getByProjectIdAndFileIdForUser(
		projectId: string,
		userId: string,
		fileId: string,
	): Promise<ProjectFile | null>;
	upsertFile(input: UpsertProjectFileInput): Promise<ProjectFile | null>;
	upsertMany(input: UpsertProjectFileInput[]): Promise<number>;
	deleteByPath(input: DeleteProjectFileByPathInput): Promise<boolean>;
}

export interface IAgentStatesRepository {
	getByProjectForUser(
		projectId: string,
		userId: string,
	): Promise<AgentState | null>;
	upsertForProject(input: UpsertAgentStateInput): Promise<AgentState | null>;
	resetForProject(input: ResetAgentStateInput): Promise<boolean>;
}

export class RepositoryError extends Error {
	override readonly cause?: unknown;

	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = "RepositoryError";
		this.cause = cause;
	}
}

export class UnauthorizedProjectAccessError extends RepositoryError {
	constructor(projectId: string, userId: string) {
		super(`Project ${projectId} is not accessible by user ${userId}`);
		this.name = "UnauthorizedProjectAccessError";
	}
}

export class UniqueConstraintError extends RepositoryError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = "UniqueConstraintError";
	}
}

export function isDatabaseUniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}
	if (!("code" in error)) {
		return false;
	}
	return (error as { code?: string }).code === "23505";
}
