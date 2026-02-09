import { type Database, projectFiles, projects } from "@shared/db";
import { and, asc, eq, exists } from "drizzle-orm";
import {
	type DeleteProjectFileByPathInput,
	type IProjectFilesRepository,
	isDatabaseUniqueViolation,
	type ProjectFile,
	UniqueConstraintError,
	type UpsertProjectFileInput,
} from "./types";

export class ProjectFilesRepository implements IProjectFilesRepository {
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

	async listByProjectForUser(
		projectId: string,
		userId: string,
	): Promise<ProjectFile[]> {
		const rows = await this.db
			.select({ file: projectFiles })
			.from(projectFiles)
			.innerJoin(
				projects,
				and(
					eq(projects.id, projectFiles.projectId),
					eq(projects.userId, userId),
				),
			)
			.where(eq(projectFiles.projectId, projectId))
			.orderBy(asc(projectFiles.path));

		return rows.map((row) => row.file);
	}

	async upsertFile(input: UpsertProjectFileInput): Promise<ProjectFile | null> {
		try {
			const canAccess = await this.canAccessProject(input.projectId, input.userId);
			if (!canAccess) {
				return null;
			}

			const [file] = await this.db
				.insert(projectFiles)
				.values({
					id: input.id,
					projectId: input.projectId,
					path: input.path,
					content: input.content,
				})
				.onConflictDoUpdate({
					target: [projectFiles.projectId, projectFiles.path],
					set: {
						content: input.content,
						updatedAt: new Date(),
					},
				})
				.returning();

			return file ?? null;
		} catch (error) {
			if (isDatabaseUniqueViolation(error)) {
				throw new UniqueConstraintError(
					`Duplicate file write detected for ${input.projectId}:${input.path}`,
					error,
				);
			}
			throw error;
		}
	}

	async upsertMany(input: UpsertProjectFileInput[]): Promise<number> {
		if (input.length === 0) {
			return 0;
		}

		try {
			return this.db.transaction(async (tx) => {
				let changedRows = 0;

				for (const file of input) {
					const [project] = await tx
						.select({
							id: projects.id,
						})
						.from(projects)
						.where(
							and(
								eq(projects.id, file.projectId),
								eq(projects.userId, file.userId),
							),
						);

					if (!project) {
						continue;
					}

					const result = await tx
						.insert(projectFiles)
						.values({
							id: file.id,
							projectId: file.projectId,
							path: file.path,
							content: file.content,
						})
						.onConflictDoUpdate({
							target: [projectFiles.projectId, projectFiles.path],
							set: {
								content: file.content,
								updatedAt: new Date(),
							},
						})
						.returning({ id: projectFiles.id });

					if (result.length > 0) {
						changedRows += 1;
					}
				}

				return changedRows;
			});
		} catch (error) {
			if (isDatabaseUniqueViolation(error)) {
				throw new UniqueConstraintError(
					"Bulk project file upsert violated a unique constraint",
					error,
				);
			}
			throw error;
		}
	}

	async deleteByPath(input: DeleteProjectFileByPathInput): Promise<boolean> {
		const result = await this.db
			.delete(projectFiles)
			.where(
				and(
					eq(projectFiles.projectId, input.projectId),
					eq(projectFiles.path, input.path),
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
			.returning({ id: projectFiles.id });

		return result.length > 0;
	}

	async getByProjectIdAndFileIdForUser(
		projectId: string,
		fileId: string,
		userId: string,
	): Promise<ProjectFile | null> {
		const [projectBelongsToUser] = await this.db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

		if (!projectBelongsToUser) {
			return null;
		}

		const [file] = await this.db
			.select()
			.from(projectFiles)
			.where(
				and(
					eq(projectFiles.id, fileId),
					eq(projectFiles.projectId, projectBelongsToUser.id),
				),
			);

		return file || null;
	}
}
