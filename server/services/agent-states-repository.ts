import { agent_states, type Database, projects } from "@shared/db";
import { and, eq, exists } from "drizzle-orm";
import {
	type AgentState,
	type IAgentStatesRepository,
	isDatabaseUniqueViolation,
	type ResetAgentStateInput,
	UniqueConstraintError,
	type UpsertAgentStateInput,
} from "./types";

export class AgentStatesRepository implements IAgentStatesRepository {
	constructor(private readonly db: Database) {}

	private async canAccessProject(
		projectId: string,
		userId: string,
	): Promise<boolean> {
		const [project] = await this.db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
			.limit(1);

		return Boolean(project);
	}

	async getByProjectForUser(
		projectId: string,
		userId: string,
	): Promise<AgentState | null> {
		const [row] = await this.db
			.select({ state: agent_states })
			.from(agent_states)
			.innerJoin(
				projects,
				and(
					eq(projects.id, agent_states.projectId),
					eq(projects.userId, userId),
				),
			)
			.where(eq(agent_states.projectId, projectId))
			.limit(1);

		return row?.state ?? null;
	}

	async upsertForProject(
		input: UpsertAgentStateInput,
	): Promise<AgentState | null> {
		try {
			const canAccess = await this.canAccessProject(
				input.projectId,
				input.userId,
			);
			if (!canAccess) {
				return null;
			}

			const [state] = await this.db
				.insert(agent_states)
				.values({
					id: input.id,
					projectId: input.projectId,
					currentState: input.currentState,
					currentPhase: input.currentPhase,
					phases: input.phases ?? [],
					generatedFiles: input.generatedFiles ?? [],
					conversationHistory: input.conversationHistory ?? [],
					sandboxId: input.sandboxId ?? null,
					previewUrl: input.previewUrl ?? null,
				})
				.onConflictDoUpdate({
					target: agent_states.projectId,
					set: {
						currentState: input.currentState,
						currentPhase: input.currentPhase,
						updatedAt: new Date(),
						...(input.phases !== undefined ? { phases: input.phases } : {}),
						...(input.generatedFiles !== undefined
							? { generatedFiles: input.generatedFiles }
							: {}),
						...(input.conversationHistory !== undefined
							? { conversationHistory: input.conversationHistory }
							: {}),
						...(input.sandboxId !== undefined
							? { sandboxId: input.sandboxId }
							: {}),
						...(input.previewUrl !== undefined
							? { previewUrl: input.previewUrl }
							: {}),
					},
				})
				.returning();

			return state ?? null;
		} catch (error) {
			if (isDatabaseUniqueViolation(error)) {
				throw new UniqueConstraintError(
					`Agent state upsert violated a unique constraint for project ${input.projectId}`,
					error,
				);
			}
			throw error;
		}
	}

	async resetForProject(input: ResetAgentStateInput): Promise<boolean> {
		const result = await this.db
			.delete(agent_states)
			.where(
				and(
					eq(agent_states.projectId, input.projectId),
					exists(
						this.db
							.select({ id: projects.id })
							.from(projects)
							.where(
								and(
									eq(projects.id, input.projectId),
									eq(projects.userId, input.userId),
								),
							),
					),
				),
			)
			.returning({ id: agent_states.id });

		return result.length > 0;
	}
}
