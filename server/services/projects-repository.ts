import { type Database, projects } from "@shared/db";
import { and, desc, eq } from "drizzle-orm";
import type {
	CreateProjectInput,
	IProjectRepository,
	Project,
	ProjectUpdatePatch,
} from "./types";

export class ProjectsRepository implements IProjectRepository {
	constructor(private readonly db: Database) {}

	async listByUserId(userId: string): Promise<Project[]> {
		return this.db
			.select()
			.from(projects)
			.where(eq(projects.userId, userId))
			.orderBy(desc(projects.updatedAt));
	}

	async getByIdForUser(
		projectId: string,
		userId: string,
	): Promise<Project | null> {
		const [project] = await this.db
			.select()
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

		return project || null;
	}

	async create(input: CreateProjectInput): Promise<Project> {
		const [project] = await this.db.insert(projects).values(input).returning();
		return project;
	}

	async updateForUser(
		projectId: string,
		userId: string,
		patch: ProjectUpdatePatch,
	): Promise<Project | null> {
		if (Object.keys(patch).length === 0) {
			return this.getByIdForUser(projectId, userId);
		}

		const [project] = await this.db
			.update(projects)
			.set(patch)
			.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
			.returning();
		return project || null;
	}

	async deleteForUser(projectId: string, userId: string): Promise<boolean> {
		const result = await this.db
			.delete(projects)
			.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
			.returning();
		return result.length > 0;
	}
}
